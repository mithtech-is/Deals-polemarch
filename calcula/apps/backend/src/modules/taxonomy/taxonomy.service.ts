import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RepairFinancialRemainderMappingInput,
  UpsertFinancialLineItemInput,
  UpsertFinancialRemainderMappingInput
} from './dto/taxonomy.dto';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async tree(statementType?: StatementType) {
    const rows = await this.prisma.financialLineItem.findMany({
      where: statementType ? { statementType } : undefined,
      orderBy: [{ orderCode: 'asc' }, { name: 'asc' }]
    });

    const map = new Map<string, any>();
    rows.forEach((row) => map.set(row.id, { ...row, children: [] }));

    const roots: any[] = [];
    rows.forEach((row) => {
      const node = map.get(row.id);
      if (row.parentId && map.has(row.parentId)) {
        map.get(row.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  flat(statementType?: StatementType) {
    return this.prisma.financialLineItem.findMany({
      where: statementType ? { statementType } : undefined,
      orderBy: [{ statementType: 'asc' }, { orderCode: 'asc' }, { name: 'asc' }]
    });
  }

  async upsert(input: UpsertFinancialLineItemInput) {
    let row;
    if (input.id) {
      row = await this.prisma.financialLineItem.update({
        where: { id: input.id },
        data: {
          code: input.code,
          name: input.name,
          statementType: input.statementType,
          orderCode: input.orderCode,
          displayOrder: input.displayOrder,
          parentId: input.parentId ?? null,
          isRequired: input.isRequired ?? false,
          isCalculated: input.isCalculated ?? false,
          formula: input.formula ?? null
        }
      });
    } else {
      row = await this.prisma.financialLineItem.create({
        data: {
          code: input.code,
          name: input.name,
          statementType: input.statementType,
          orderCode: input.orderCode,
          displayOrder: input.displayOrder,
          parentId: input.parentId ?? null,
          isRequired: input.isRequired ?? false,
          isCalculated: input.isCalculated ?? false,
          formula: input.formula ?? null
        }
      });
    }
    await this.normalizeRequiredFlags(input.statementType);
    return row;
  }

  async delete(id: string) {
    const exists = await this.prisma.financialLineItem.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Line item not found');
    }
    const statementType = exists.statementType;
    await this.prisma.financialLineItem.delete({ where: { id } });
    await this.normalizeRequiredFlags(statementType);
    return true;
  }

  async remainderMappings(statementType?: StatementType) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        parentLineItemId: string;
        parentStatementType: StatementType;
        parentCode: string;
        parentName: string;
        remainderLineItemId: string;
        remainderCode: string;
        remainderName: string;
        parentParentId: string | null;
      }>
    >`
      SELECT
        m.id::text AS "id",
        m.parent_line_item_id::text AS "parentLineItemId",
        p.statement_type AS "parentStatementType",
        p.code AS "parentCode",
        p.name AS "parentName",
        p.parent_id::text AS "parentParentId",
        m.remainder_line_item_id::text AS "remainderLineItemId",
        r.code AS "remainderCode",
        r.name AS "remainderName"
      FROM financial_remainder_mappings m
      JOIN financial_line_items p ON p.id = m.parent_line_item_id
      JOIN financial_line_items r ON r.id = m.remainder_line_item_id
      ORDER BY p.order_code ASC, p.name ASC
    `;
    return rows
      .filter((row) => !statementType || row.parentStatementType === statementType)
      .map(({ parentStatementType: _parentStatementType, ...row }) => {
        const valid = Boolean(row.parentParentId);
        return {
          ...row,
          isValid: valid,
          validationMessage: valid ? null : 'Statement root mappings are disabled unless explicitly repaired'
        };
      });
  }

  async upsertRemainderMapping(input: UpsertFinancialRemainderMappingInput) {
    const [parent, remainder] = await Promise.all([
      this.prisma.financialLineItem.findUnique({ where: { id: input.parentLineItemId } }),
      this.prisma.financialLineItem.findUnique({ where: { id: input.remainderLineItemId } })
    ]);
    if (!parent) throw new NotFoundException('Parent line item not found');
    if (!remainder) throw new NotFoundException('Remainder line item not found');
    if (parent.id === remainder.id) throw new BadRequestException('Parent and remainder line items cannot be the same');
    if (parent.statementType !== remainder.statementType) {
      throw new BadRequestException('Parent and remainder must belong to same statement type');
    }
    const childCount = await this.prisma.financialLineItem.count({
      where: { parentId: parent.id }
    });
    if (childCount === 0) {
      throw new BadRequestException('Parent line item must have children');
    }
    const isDescendant = await this.isDescendantOfParent(remainder.id, parent.id);
    if (!isDescendant) {
      throw new BadRequestException('Remainder line item must belong to the selected parent subtree');
    }

    await this.prisma.$executeRaw`
      INSERT INTO financial_remainder_mappings (parent_line_item_id, remainder_line_item_id, created_at, updated_at)
      VALUES (${input.parentLineItemId}::uuid, ${input.remainderLineItemId}::uuid, now(), now())
      ON CONFLICT (parent_line_item_id) DO UPDATE
      SET remainder_line_item_id = EXCLUDED.remainder_line_item_id,
          updated_at = now()
    `;
    const full = (await this.remainderMappings(parent.statementType)).find(
      (mapping) => mapping.parentLineItemId === parent.id
    );
    if (!full) throw new NotFoundException('Remainder mapping not found after save');
    return full;
  }

  async repairRemainderMapping(input: RepairFinancialRemainderMappingInput) {
    const parent = await this.prisma.financialLineItem.findUnique({
      where: { id: input.parentLineItemId }
    });
    if (!parent) throw new NotFoundException('Parent line item not found');

    const existingMap = await this.prisma.$queryRaw<Array<{ id: string; remainderLineItemId: string }>>`
      SELECT id::text AS id, remainder_line_item_id::text AS "remainderLineItemId"
      FROM financial_remainder_mappings
      WHERE parent_line_item_id = ${input.parentLineItemId}::uuid
      LIMIT 1
    `;
    if (existingMap.length) {
      const row = (await this.remainderMappings(parent.statementType)).find(
        (mapping) => mapping.parentLineItemId === input.parentLineItemId
      );
      if (row) return row;
    }

    const childCount = await this.prisma.financialLineItem.count({
      where: { parentId: parent.id }
    });
    if (childCount === 0) {
      throw new BadRequestException('Cannot create remainder mapping for a leaf node');
    }

    const siblings = await this.prisma.financialLineItem.findMany({
      where: { parentId: parent.id },
      orderBy: [{ orderCode: 'asc' }]
    });
    const existingOthers = siblings.find((row) => /(^|_)others?$/.test(row.code) || /^other /i.test(row.name));

    let remainderId = existingOthers?.id;
    if (!remainderId) {
      const baseCode = `${parent.code}_others`;
      let candidateCode = baseCode;
      let suffix = 2;
      while (await this.prisma.financialLineItem.findUnique({ where: { code: candidateCode } })) {
        candidateCode = `${baseCode}_${suffix}`;
        suffix += 1;
      }
      const maxOrder = siblings.reduce((max, row) => {
        const n = Number(row.orderCode);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, Number(parent.orderCode) * 100);
      const defaultOrder = `${maxOrder + 1}`;
      const created = await this.prisma.financialLineItem.create({
        data: {
          code: candidateCode,
          name: `Other ${parent.name}`,
          parentId: parent.id,
          statementType: parent.statementType,
          orderCode: defaultOrder,
          displayOrder: (siblings[siblings.length - 1]?.displayOrder ?? 0) + 1,
          isRequired: false,
          isCalculated: false,
          formula: null
        }
      });
      remainderId = created.id;
    }

    await this.prisma.$executeRaw`
      INSERT INTO financial_remainder_mappings (parent_line_item_id, remainder_line_item_id, created_at, updated_at)
      VALUES (${parent.id}::uuid, ${remainderId}::uuid, now(), now())
      ON CONFLICT (parent_line_item_id) DO UPDATE
      SET remainder_line_item_id = EXCLUDED.remainder_line_item_id,
          updated_at = now()
    `;
    await this.normalizeRequiredFlags(parent.statementType);
    const mapped = (await this.remainderMappings(parent.statementType)).find(
      (row) => row.parentLineItemId === parent.id
    );
    if (!mapped) throw new NotFoundException('Remainder mapping repair failed');
    return mapped;
  }

  async deleteRemainderMapping(id: string) {
    const exists = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id FROM financial_remainder_mappings WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!exists.length) {
      throw new NotFoundException('Remainder mapping not found');
    }
    await this.prisma.$executeRaw`DELETE FROM financial_remainder_mappings WHERE id = ${id}::uuid`;
    return true;
  }

  private async isDescendantOfParent(lineItemId: string, parentId: string) {
    const result = await this.prisma.$queryRaw<Array<{ found: boolean }>>`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM financial_line_items WHERE id = ${lineItemId}::uuid
        UNION ALL
        SELECT li.id, li.parent_id
        FROM financial_line_items li
        INNER JOIN ancestors a ON a.parent_id = li.id
      )
      SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = ${parentId}::uuid) AS found
    `;
    return result[0]?.found ?? false;
  }

  private async normalizeRequiredFlags(statementType: StatementType) {
    await this.prisma.$executeRaw`
      WITH parent_nodes AS (
        SELECT DISTINCT parent_id AS id
        FROM financial_line_items
        WHERE parent_id IS NOT NULL
          AND statement_type = ${statementType}::statement_type
      )
      UPDATE financial_line_items li
      SET is_required = (li.id IN (SELECT id FROM parent_nodes)),
          updated_at = now()
      WHERE li.statement_type = ${statementType}::statement_type
    `;
  }
}
