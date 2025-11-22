import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getHistory(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const language = req.query.language as string | undefined;

    // Validation
    if (page < 1) {
      return res.status(400).json({ error: 'Page must be greater than 0' });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (language) {
      where.language = language;
    }

    // Get total count and generations
    const [total, generations] = await Promise.all([
      prisma.generation.count({ where }),
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      generations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}


