"""Article summarizer - generates AI summaries via Claude API.

Uses article title + snippet (already extracted from RSS) as input.
Google News RSS redirect URLs make direct article fetching unreliable,
so we summarize from the metadata we already have.
"""

from __future__ import annotations

import logging
import os
import time

import anthropic

from .utils import load_json, save_json

logger = logging.getLogger(__name__)

# Haiku for cost efficiency (~$0.001 per summary)
MODEL = "claude-haiku-4-5"
MAX_ARTICLES_PER_RUN = 30
BATCH_SIZE = 5  # Summarize in batches to reduce API calls


def summarize_batch(client: anthropic.Anthropic, articles: list[dict]) -> list[str]:
    """Summarize a batch of articles in a single API call."""
    article_texts = []
    for i, a in enumerate(articles, 1):
        article_texts.append(
            f"Article {i}:\n"
            f"Title: {a.get('title', '')}\n"
            f"Source: {a.get('source', '')}\n"
            f"Snippet: {a.get('snippet', '')}\n"
        )

    prompt = (
        "Summarize each of the following news articles in 1-2 concise sentences. "
        "Focus on the key facts relevant to investors interested in unlisted/pre-IPO shares. "
        "Return ONLY the summaries, one per line, prefixed with the article number.\n\n"
        + "\n".join(article_texts)
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    result_text = ""
    for block in response.content:
        if block.type == "text":
            result_text = block.text
            break

    # Parse individual summaries from response
    summaries = []
    lines = result_text.strip().split("\n")

    # Group lines by article number
    current_summary = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Check if this starts a new article summary
        import re
        if re.match(r"^Article\s*\d+[:\.]", line, re.I):
            if current_summary:
                summaries.append(" ".join(current_summary))
            # Remove the "Article N:" prefix
            cleaned = re.sub(r"^Article\s*\d+[:\.\s]*", "", line, flags=re.I)
            current_summary = [cleaned] if cleaned else []
        else:
            current_summary.append(line)
    if current_summary:
        summaries.append(" ".join(current_summary))

    # Pad if we got fewer summaries than articles
    while len(summaries) < len(articles):
        summaries.append("")

    return summaries[:len(articles)]


def scrape() -> int:
    """Summarize unsummarized articles. Returns count of new summaries."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping summarization")
        return 0

    client = anthropic.Anthropic(api_key=api_key)
    articles = load_json("news.json")

    # Find articles without summaries (empty string = already attempted)
    unsummarized = [a for a in articles if "summary" not in a]
    if not unsummarized:
        logger.info("All articles already have summaries")
        return 0

    # Cap per run
    to_summarize = unsummarized[:MAX_ARTICLES_PER_RUN]
    logger.info(f"Summarizing {len(to_summarize)} of {len(unsummarized)} unsummarized articles")

    count = 0
    # Process in batches
    for i in range(0, len(to_summarize), BATCH_SIZE):
        batch = to_summarize[i : i + BATCH_SIZE]

        try:
            summaries = summarize_batch(client, batch)
            for article, summary in zip(batch, summaries):
                article["summary"] = summary
                if summary:
                    count += 1
        except Exception as e:
            logger.error(f"Batch summarization failed: {e}")
            for article in batch:
                article["summary"] = ""

        # Small delay between batches
        if i + BATCH_SIZE < len(to_summarize):
            time.sleep(1)

    # Save updated articles
    save_json("news.json", articles)
    logger.info(f"Generated {count} summaries in {(len(to_summarize) + BATCH_SIZE - 1) // BATCH_SIZE} API calls")
    return count
