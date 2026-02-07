---
name: pdf-processor
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
license: MIT
compatibility: Requires Node.js environment with pdf-parse library
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: document-processing
  tags: pdf extract text tables forms merge
allowed-tools: Read Write Bash(node:*)
---

# PDF Processor Skill

This skill provides comprehensive PDF processing capabilities including text extraction, table parsing, form filling, and document merging.

## When to Use

- Extracting text from PDF documents
- Parsing tables from PDF files
- Filling PDF forms programmatically
- Merging multiple PDFs into one
- Splitting PDF documents
- Converting PDF to other formats

## Quick Start

### Extract Text

```javascript
const result = await skill.execute('extract-text', {
  filePath: '/path/to/document.pdf',
  pages: [1, 2, 3], // optional, default all pages
});
```

### Extract Tables

```javascript
const result = await skill.execute('extract-tables', {
  filePath: '/path/to/document.pdf',
  page: 1,
});
```

### Fill Form

```javascript
const result = await skill.execute('fill-form', {
  templatePath: '/path/to/form.pdf',
  data: {
    field1: 'value1',
    field2: 'value2',
  },
  outputPath: '/path/to/output.pdf',
});
```

### Merge PDFs

```javascript
const result = await skill.execute('merge', {
  files: ['/path/to/doc1.pdf', '/path/to/doc2.pdf'],
  outputPath: '/path/to/merged.pdf',
});
```

## Available Operations

1. **extract-text** - Extract plain text from PDF
2. **extract-tables** - Extract tables as structured data
3. **fill-form** - Fill PDF form fields
4. **merge** - Merge multiple PDFs
5. **split** - Split PDF into multiple files
6. **compress** - Compress PDF file size

## Parameters Reference

See [references/PARAMETERS.md](references/PARAMETERS.md) for detailed parameter documentation.

## Examples

See [references/EXAMPLES.md](references/EXAMPLES.md) for more usage examples.

## Error Handling

All operations return a standard result object:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

## Limitations

- Maximum file size: 100MB
- Scanned PDFs require OCR (not supported in basic mode)
- Encrypted PDFs must be decrypted first
