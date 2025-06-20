export const fileSchema = {
    title: 'Files Schema',
    version: 0,
    type: 'object',
    primaryKey: 'path',
    properties: {
        path: { type: 'string' ,   maxLength: 100 },
        content: { type: 'string' },
        lastModified: { type: 'string' },
    },
    required: ['path', 'content'],
};