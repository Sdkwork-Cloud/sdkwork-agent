# PDF Processor Examples

Practical examples for common PDF processing tasks.

## Example 1: Extract Text from Invoice

```javascript
const result = await skill.execute('extract-text', {
  filePath: './documents/invoice-2024-001.pdf',
  pages: [1], // Just the first page
});

if (result.success) {
  console.log('Extracted text:', result.data.text);
  console.log('Word count:', result.data.wordCount);
}
```

## Example 2: Extract Tables from Financial Report

```javascript
const result = await skill.execute('extract-tables', {
  filePath: './reports/q4-financial.pdf',
  page: 3,
});

if (result.success) {
  const table = result.data.tables[0];
  console.log(`Table has ${table.rows} rows and ${table.columns} columns`);
  console.log('Data:', table.data);
}
```

## Example 3: Fill Application Form

```javascript
const formData = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, City, State 12345',
  dateOfBirth: '1990-05-15',
  agreeToTerms: true,
};

const result = await skill.execute('fill-form', {
  templatePath: './forms/application-template.pdf',
  data: formData,
  outputPath: './output/filled-application.pdf',
  flatten: true,
});

if (result.success) {
  console.log(`Form filled successfully with ${result.data.fieldsFilled} fields`);
  console.log('Output saved to:', result.data.outputPath);
}
```

## Example 4: Merge Multiple Reports

```javascript
const result = await skill.execute('merge', {
  files: ['./reports/january.pdf', './reports/february.pdf', './reports/march.pdf'],
  outputPath: './output/q1-combined-report.pdf',
});

if (result.success) {
  console.log(`Merged ${result.data.inputFiles} files into ${result.data.outputPath}`);
  console.log(`Total pages: ${result.data.totalPages}`);
}
```

## Example 5: Split Large Document

```javascript
const result = await skill.execute('split', {
  filePath: './documents/large-manual.pdf',
  pages: [10, 25, 40], // Split after pages 10, 25, and 40
  outputDir: './output/manual-parts/',
});

if (result.success) {
  console.log(`Document split into ${result.data.totalParts} parts`);
  result.data.outputFiles.forEach((file, index) => {
    console.log(`Part ${index + 1}: ${file}`);
  });
}
```

## Example 6: Compress for Email

```javascript
const result = await skill.execute('compress', {
  filePath: './documents/presentation.pdf',
  outputPath: './output/presentation-compressed.pdf',
  quality: 'medium',
});

if (result.success) {
  console.log(`Compressed from ${result.data.originalSize} to ${result.data.compressedSize}`);
  console.log(`Compression ratio: ${result.data.compressionRatio}`);
}
```

## Error Handling Best Practices

```javascript
try {
  const result = await skill.execute('extract-text', {
    filePath: './documents/unknown.pdf',
  });

  if (!result.success) {
    console.error('Operation failed:', result.error);

    // Handle specific errors
    if (result.error.includes('not found')) {
      console.log('Please check if the file exists');
    } else if (result.error.includes('encrypted')) {
      console.log('The PDF is encrypted and cannot be processed');
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```
