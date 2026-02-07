# PDF Processor Parameters Reference

Complete reference for all PDF processor operations and their parameters.

## extract-text

Extract plain text from PDF documents.

### Parameters

| Parameter      | Type     | Required | Default | Description                           |
| -------------- | -------- | -------- | ------- | ------------------------------------- |
| filePath       | string   | Yes      | -       | Path to the PDF file                  |
| pages          | number[] | No       | all     | Specific pages to extract (1-indexed) |
| preserveLayout | boolean  | No       | false   | Preserve original layout              |

### Returns

```typescript
{
  success: boolean;
  data?: {
    text: string;
    pages: number[] | 'all';
    wordCount: number;
  };
  error?: string;
}
```

## extract-tables

Extract tables from PDF as structured data.

### Parameters

| Parameter  | Type   | Required | Default | Description                             |
| ---------- | ------ | -------- | ------- | --------------------------------------- |
| filePath   | string | Yes      | -       | Path to the PDF file                    |
| page       | number | No       | 1       | Page number to extract tables from      |
| tableIndex | number | No       | 0       | Specific table index if multiple tables |

### Returns

```typescript
{
  success: boolean;
  data?: {
    tables: Array<{
      page: number;
      rows: number;
      columns: number;
      data: string[][];
    }>;
  };
  error?: string;
}
```

## fill-form

Fill PDF form fields programmatically.

### Parameters

| Parameter    | Type    | Required | Default | Description                     |
| ------------ | ------- | -------- | ------- | ------------------------------- |
| templatePath | string  | Yes      | -       | Path to the PDF form template   |
| data         | object  | Yes      | -       | Key-value pairs for form fields |
| outputPath   | string  | Yes      | -       | Path for the filled output PDF  |
| flatten      | boolean | No       | false   | Flatten form after filling      |

### Returns

```typescript
{
  success: boolean;
  data?: {
    outputPath: string;
    fieldsFilled: number;
  };
  error?: string;
}
```

## merge

Merge multiple PDFs into a single document.

### Parameters

| Parameter  | Type     | Required | Default | Description                |
| ---------- | -------- | -------- | ------- | -------------------------- |
| files      | string[] | Yes      | -       | Array of PDF file paths    |
| outputPath | string   | Yes      | -       | Path for the merged output |

### Returns

```typescript
{
  success: boolean;
  data?: {
    outputPath: string;
    inputFiles: number;
    totalPages: number;
  };
  error?: string;
}
```

## split

Split a PDF into multiple files.

### Parameters

| Parameter | Type     | Required | Default | Description                 |
| --------- | -------- | -------- | ------- | --------------------------- |
| filePath  | string   | Yes      | -       | Path to the PDF file        |
| pages     | number[] | Yes      | -       | Page numbers where to split |
| outputDir | string   | Yes      | -       | Directory for output files  |

### Returns

```typescript
{
  success: boolean;
  data?: {
    outputFiles: string[];
    totalParts: number;
  };
  error?: string;
}
```

## compress

Compress PDF file size.

### Parameters

| Parameter  | Type   | Required | Default  | Description                                  |
| ---------- | ------ | -------- | -------- | -------------------------------------------- |
| filePath   | string | Yes      | -        | Path to the PDF file                         |
| outputPath | string | Yes      | -        | Path for the compressed output               |
| quality    | string | No       | 'medium' | Compression quality: 'low', 'medium', 'high' |

### Returns

```typescript
{
  success: boolean;
  data?: {
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
    outputPath: string;
  };
  error?: string;
}
```
