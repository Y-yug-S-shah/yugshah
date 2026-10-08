import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import resume from '../src/data/resume.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'public', 'resume.pdf');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const fileHandle = await fs.open(outputPath, 'w');
const writeStream = fileHandle.createWriteStream();

doc.pipe(writeStream);

const basics = resume.basics;
doc.fontSize(24).text(basics.name);
doc.fontSize(12).fillColor('#4b5563').text(basics.label);
doc.moveDown(0.5);
doc.text(basics.email);
doc.text(basics.url);

doc.moveDown();
doc.fontSize(18).fillColor('#111827').text('Professional Summary');
doc.fontSize(11).fillColor('#374151').text(basics.summary, { align: 'justify' });

doc.moveDown();
doc.fontSize(18).fillColor('#111827').text('Experience');
for (const job of resume.work) {
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#111827').text(`${job.position} — ${job.company}`);
  doc.fontSize(10).fillColor('#4b5563').text(`${job.startDate} to ${job.endDate}`);
  doc.fontSize(10).fillColor('#374151').text(job.summary, { align: 'justify' });
}

doc.addPage();

doc.fontSize(18).fillColor('#111827').text('Projects');
for (const project of resume.projects) {
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#111827').text(project.name);
  doc.fontSize(9).fillColor('#2563eb').text(project.url, {
    link: project.url,
    underline: true
  });
  doc.fontSize(10).fillColor('#374151').text(project.description, { align: 'justify' });
}

doc.moveDown();
doc.fontSize(18).fillColor('#111827').text('Education');
for (const edu of resume.education) {
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#111827').text(edu.institution);
  doc.fontSize(10).fillColor('#374151').text(`${edu.studyType} in ${edu.area} • ${edu.endDate}`);
}

doc.moveDown();
doc.fontSize(18).fillColor('#111827').text('Skills');
for (const group of resume.skills) {
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#111827').text(group.name);
  doc.fontSize(10).fillColor('#374151').text(group.keywords.join(' • '));
}

doc.moveDown();
doc.fontSize(18).fillColor('#111827').text('Certifications');
doc.fontSize(10).fillColor('#374151').text(resume.certifications.join('\n'));

doc.on('end', async () => {
  await fileHandle.close();
  console.log(`Generated PDF at ${outputPath}`);
});

doc.end();
