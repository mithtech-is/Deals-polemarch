"""Alert system - sends email alerts via Emailit API for important events."""

import logging
import os

import httpx

from .utils import load_yaml

logger = logging.getLogger(__name__)

EMAILIT_API_URL = "https://api.emailit.com/v2/emails"


def send_email(subject: str, html_body: str) -> bool:
    """Send an alert email via Emailit API."""
    api_key = os.environ.get("EMAILIT_API_KEY")
    if not api_key:
        logger.warning("EMAILIT_API_KEY not set, skipping email")
        return False

    config = load_yaml("keywords.yml").get("alerts", {})
    sender = config.get("sender", "alerts@unlistedpulse.com")
    subscribers = config.get("subscribers", [])

    if not subscribers:
        logger.warning("No subscribers configured")
        return False

    try:
        resp = httpx.post(
            EMAILIT_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": sender,
                "to": subscribers,
                "subject": subject,
                "html": html_body,
            },
            timeout=15,
        )
        resp.raise_for_status()
        logger.info(f"Alert sent: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send alert: {e}")
        return False


def format_new_drhp(filings: list[dict]) -> str:
    """Format new DRHP filings into an HTML email."""
    items = ""
    for f in filings:
        items += f"""
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">{f['company']}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{f.get('issue_size', 'N/A')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{f.get('exchange', '')}</td>
        </tr>"""

    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a1a">New DRHP Filing(s)</h2>
        <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left">Company</th>
                <th style="padding:8px;text-align:left">Issue Size</th>
                <th style="padding:8px;text-align:left">Exchange</th>
            </tr>
            {items}
        </table>
        <p style="margin-top:16px;color:#666;font-size:14px">
            <a href="https://unlistedpulse.pages.dev">View on UnlistedPulse</a>
        </p>
    </div>"""


def format_drhp_status_change(filings: list[dict]) -> str:
    """Format DRHP status changes into HTML."""
    items = ""
    for f in filings:
        items += f"<li><strong>{f['company']}</strong>: {f.get('previous_status', '?')} → {f.get('status', '?')}</li>"

    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a1a">DRHP Status Change</h2>
        <ul>{items}</ul>
        <p style="margin-top:16px;color:#666;font-size:14px">
            <a href="https://unlistedpulse.pages.dev">View on UnlistedPulse</a>
        </p>
    </div>"""


def format_gmp_move(entries: list[dict]) -> str:
    """Format big GMP moves into HTML."""
    items = ""
    for e in entries:
        direction = "↑" if (e.get("gmp", 0) or 0) > (e.get("previous_gmp", 0) or 0) else "↓"
        items += f"""
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">{e['company']}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">₹{e.get('previous_gmp', 'N/A')}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">₹{e.get('gmp', 'N/A')} {direction}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{e.get('gmp_change_pct', 0)}%</td>
        </tr>"""

    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a1a">Big GMP Move</h2>
        <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left">Company</th>
                <th style="padding:8px;text-align:left">Previous GMP</th>
                <th style="padding:8px;text-align:left">Current GMP</th>
                <th style="padding:8px;text-align:left">Change</th>
            </tr>
            {items}
        </table>
        <p style="margin-top:16px;color:#666;font-size:14px">
            <a href="https://unlistedpulse.pages.dev">View on UnlistedPulse</a>
        </p>
    </div>"""


def send_alerts(
    new_drhp: list[dict],
    changed_drhp: list[dict],
    gmp_moves: list[dict],
    new_articles: list[dict],
) -> int:
    """Process all alert conditions and send emails. Returns count of alerts sent."""
    sent = 0

    if new_drhp:
        names = ", ".join(f["company"] for f in new_drhp[:3])
        subject = f"[UnlistedPulse] New DRHP: {names}"
        if send_email(subject, format_new_drhp(new_drhp)):
            sent += 1

    if changed_drhp:
        names = ", ".join(f["company"] for f in changed_drhp[:3])
        subject = f"[UnlistedPulse] DRHP Status Change: {names}"
        if send_email(subject, format_drhp_status_change(changed_drhp)):
            sent += 1

    if gmp_moves:
        names = ", ".join(e["company"] for e in gmp_moves[:3])
        subject = f"[UnlistedPulse] GMP Alert: {names}"
        if send_email(subject, format_gmp_move(gmp_moves)):
            sent += 1

    # Major news alerts - articles from top-tier sources about tracked companies
    config = load_yaml("keywords.yml").get("alerts", {})
    top_sources = config.get("top_tier_sources", [])
    major_news = [
        a
        for a in new_articles
        if a.get("isin") and a.get("source") in top_sources
    ]
    if major_news:
        for article in major_news[:5]:  # Cap at 5 alerts per run
            subject = f"[UnlistedPulse] {article.get('company_name', 'News')}: {article['title'][:60]}"
            html = f"""
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#1a1a1a">{article['title']}</h2>
                <p style="color:#666">Source: {article.get('source', 'Unknown')}</p>
                <p>{article.get('snippet', '')}</p>
                <p><a href="{article['url']}">Read full article</a></p>
                <p style="margin-top:16px;color:#999;font-size:12px">
                    <a href="https://unlistedpulse.pages.dev">UnlistedPulse</a>
                </p>
            </div>"""
            if send_email(subject, html):
                sent += 1

    return sent
