#!/usr/bin/env node
/**
 * Extract speaker notes from reveal.js HTML decks.
 * Usage: node scripts/extract-speaker-notes.js <input.html> [--format md|html] [--out file]
 */

import fs from 'fs';
import path from 'path';

function decodeEntities(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&rsquo;/g, '\u2019')
		.replace(/&lsquo;/g, '\u2018')
		.replace(/&rdquo;/g, '\u201D')
		.replace(/&ldquo;/g, '\u201C')
		.replace(/&mdash;/g, '\u2014')
		.replace(/&ndash;/g, '\u2013')
		.replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
	return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function htmlToPlain(html) {
	let text = html.trim();
	text = text.replace(/<br\s*\/?>/gi, '\n');
	text = text.replace(/<\/p>\s*<p>/gi, '\n\n');
	text = text.replace(/<p[^>]*>/gi, '');
	text = text.replace(/<\/p>/gi, '\n');
	text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, inner) => `**${stripTags(inner)}**`);
	text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, inner) => `*${stripTags(inner)}*`);
	text = text.replace(/<[^>]+>/g, '');
	text = decodeEntities(text);
	text = text
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.join('\n');
	text = text.replace(/\*\*([^*]+)\*\*(?=\S)/g, '**$1** ');
	text = text.replace(/\n{3,}/g, '\n\n');
	return text.trim();
}

function findMatchingCloseSection(content, openStart) {
	const openEnd = content.indexOf('>', openStart) + 1;
	let depth = 1;
	let i = openEnd;
	while (i < content.length && depth > 0) {
		const nextOpen = content.indexOf('<section', i);
		const nextClose = content.indexOf('</section>', i);
		if (nextClose === -1) break;
		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth++;
			i = nextOpen + 8;
		} else {
			depth--;
			if (depth === 0) return nextClose + '</section>'.length;
			i = nextClose + 10;
		}
	}
	return -1;
}

function parseDirectChildSections(content) {
	const sections = [];
	let i = 0;
	while (i < content.length) {
		const open = content.indexOf('<section', i);
		if (open === -1) break;
		const close = findMatchingCloseSection(content, open);
		if (close === -1) break;
		sections.push(content.slice(open, close));
		i = close;
	}
	return sections;
}

function getSectionInner(sectionHtml) {
	const openEnd = sectionHtml.indexOf('>') + 1;
	return sectionHtml.slice(openEnd, sectionHtml.lastIndexOf('</section>'));
}

function getSlideTitle(sectionHtml) {
	const withoutNotes = sectionHtml.replace(/<aside class="notes"[\s\S]*?<\/aside>/gi, '');
	for (const tag of ['h1', 'h2', 'h3']) {
		const match = withoutNotes.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
		if (match) {
			const title = stripTags(match[1]);
			if (title) return title;
		}
	}
	const dataTitle = sectionHtml.match(/data-title="([^"]*)"/i);
	if (dataTitle) return decodeEntities(dataTitle[1]);
	return null;
}

function getSlideNotes(sectionHtml) {
	if (sectionHtml.match(/\bdata-notes="/i)) {
		const match = sectionHtml.match(/\bdata-notes="([^"]*)"/i);
		if (match) return decodeEntities(match[1]);
	}
	const notes = [];
	const re = /<aside class="notes"[^>]*>([\s\S]*?)<\/aside>/gi;
	let m;
	while ((m = re.exec(sectionHtml)) !== null) {
		if (!m[1].match(/^\s*$/)) notes.push(m[1].trim());
	}
	if (notes.length === 0) return null;
	return notes.join('\n\n');
}

function collectSlides(sectionHtml, out) {
	const inner = getSectionInner(sectionHtml);
	const children = parseDirectChildSections(inner);
	if (children.length > 0) {
		for (const child of children) collectSlides(child, out);
		return;
	}
	const notes = getSlideNotes(sectionHtml);
	if (notes) {
		out.push({
			title: getSlideTitle(sectionHtml),
			notesHtml: notes,
			notesPlain: htmlToPlain(notes),
		});
	}
}

function extractSlidesContent(html) {
	const marker = '<div class="slides">';
	const slidesStart = html.indexOf(marker);
	if (slidesStart === -1) throw new Error('No .slides container found');
	const contentStart = slidesStart + marker.length;

	let depth = 0;
	for (let i = contentStart; i < html.length; i++) {
		if (html.startsWith('<section', i)) {
			depth++;
			i += 7;
			continue;
		}
		if (html.startsWith('</section>', i)) {
			depth--;
			i += 9;
			if (depth === 0) {
				let j = i + 1;
				while (j < html.length && /\s/.test(html[j])) j++;
				if (html.startsWith('</div>', j)) return html.slice(contentStart, j);
			}
			continue;
		}
	}

	throw new Error('Could not find end of .slides container');
}

function extractFromFile(filePath) {
	const html = fs.readFileSync(filePath, 'utf8');
	const slidesContent = extractSlidesContent(html);
	const topSections = parseDirectChildSections(slidesContent);
	const slides = [];
	for (const section of topSections) collectSlides(section, slides);
	return slides;
}

function renderMarkdown(slides, sourceFile) {
	const base = path.basename(sourceFile);
	let md = `# Speaker Notes\n\nExtracted from [\`${base}\`](${base}).\n\n`;
	slides.forEach((slide, i) => {
		const num = i + 1;
		const heading = slide.title ? `Slide ${num}: ${slide.title}` : `Slide ${num}`;
		md += `## ${heading}\n\n${slide.notesPlain}\n\n---\n\n`;
	});
	return md;
}

function renderHtml(slides, sourceFile) {
	const base = path.basename(sourceFile);
	const sections = slides
		.map((slide, i) => {
			const num = i + 1;
			const title = slide.title
				? `<span class="slide-num">Slide ${num}</span><span class="slide-title">${escapeHtml(slide.title)}</span>`
				: `<span class="slide-num">Slide ${num}</span>`;
			return `<section class="note-slide">\n<h2>${title}</h2>\n<div class="note-body">${decodeEntities(slide.notesHtml)}</div>\n</section>`;
		})
		.join('\n\n');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Speaker Notes — ${escapeHtml(base)}</title>
	<style>
		:root {
			--text: #1a1a1a;
			--muted: #5c6778;
			--border: #d4d9e0;
			--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			padding: 2rem 2.5rem;
			font-family: var(--font);
			font-size: 16px;
			line-height: 1.55;
			color: var(--text);
			background: #fff;
			max-width: 780px;
			margin-inline: auto;
		}
		header {
			margin-bottom: 2.5rem;
			padding-bottom: 1rem;
			border-bottom: 2px solid var(--border);
		}
		header h1 {
			margin: 0 0 0.35rem;
			font-size: 1.75rem;
			font-weight: 700;
		}
		header p {
			margin: 0;
			color: var(--muted);
			font-size: 0.95rem;
		}
		.note-slide {
			margin-bottom: 2rem;
			padding-bottom: 1.75rem;
			border-bottom: 1px solid var(--border);
			break-inside: avoid;
		}
		.note-slide:last-child { border-bottom: none; }
		.note-slide h2 {
			margin: 0 0 0.75rem;
			font-size: 1.05rem;
			font-weight: 600;
			line-height: 1.35;
		}
		.slide-num {
			display: inline-block;
			min-width: 4.5rem;
			color: var(--muted);
			font-weight: 600;
		}
		.slide-title { font-weight: 600; }
		.note-body p { margin: 0 0 0.65rem; }
		.note-body p:last-child { margin-bottom: 0; }
		.note-body strong { font-weight: 600; }
		@media print {
			body { padding: 0.5in; max-width: none; font-size: 11pt; }
			header { margin-bottom: 1.25rem; }
			.note-slide { page-break-inside: avoid; }
		}
	</style>
</head>
<body>
	<header>
		<h1>Speaker Notes</h1>
		<p>Extracted from <a href="${escapeHtml(base)}">${escapeHtml(base)}</a> · ${slides.length} slides</p>
	</header>
	<main>
${sections}
	</main>
</body>
</html>
`;
}

function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('Usage: node scripts/extract-speaker-notes.js <input.html> [--format md|html] [--out file]');
	process.exit(1);
}

const input = args[0];
const formatIdx = args.indexOf('--format');
const outIdx = args.indexOf('--out');
const format = formatIdx !== -1 ? args[formatIdx + 1] : 'md';
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;

const slides = extractFromFile(input);
const output = format === 'html' ? renderHtml(slides, input) : renderMarkdown(slides, input);

if (outFile) {
	fs.writeFileSync(outFile, output, 'utf8');
	console.log(`Wrote ${slides.length} slides to ${outFile}`);
} else {
	process.stdout.write(output);
}
