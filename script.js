"use strict";

const WIKTIONARY = "https://en.wiktionary.org/wiki/";
const WIKIPEDIA = "https://en.wikipedia.org/wiki/";

const words1 = new Set();
const words2 = new Set();
const words3 = new Set();
const words4 = new Set();
const wikis = new Set();

const numberFormat = new Intl.NumberFormat();

const formatter1 = new Intl.ListFormat([], { style: "short" });
const formatter2 = new Intl.ListFormat([], { style: "narrow" });

const awords = Array.from(document.getElementsByName("words"));
const awiki = document.getElementById("wiki");
const amax = document.getElementById("max");


function settings() {
	const words = parseInt(awords.find((r) => r.checked).value, 10);
	const wiki = awiki.checked;
	const max = amax.valueAsNumber;

	let word = null;

	switch (words) {
		case 1:
			word = words1;
			break;
		case 2:
			word = words2;
			break;
		case 3:
			word = words3;
			break;
		case 4:
			word = words4;
			break;
	}

	let count = 0;

	for (const element of words4) {
		const show = word.has(element) && (!wiki || wikis.has(element));
		element.style.display = show && count < max ? "" : "none";
		if (show) {
			++count;
		}
	}

	document.getElementById("total").textContent = `${numberFormat.format(count)} / ${numberFormat.format(words4.size)}${count > max ? ` (Only the first ${numberFormat.format(max)} shown)` : ""}`;
}

function encodeXML(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&apos;"
	};
	return text.replace(/[&<>"']/gu, (m) => map[m]);
}

addEventListener("load", (event) => {
	const wikt = document.getElementById("wiktionary");

	wikt.textContent = "Loading…";

	const template = document.getElementById("awiktionary");
	const clone = template.content.cloneNode(true);

	const table = clone.getElementById("table");

	fetch("wiktionary/Wiktionary words.tsv").then(async (response) => {
		if (response.ok) {
			const text = await response.text();
			// console.log(text);

			const data = text.split("\n").filter((r) => r.length).map((r) => r.split("\t"));
			// console.log(data);

			for (const [key, words, num, forms, pos, wiki] of data) {
				const row = table.insertRow();

				let cell = row.insertCell();
				const awords = words.split(",");
				cell.innerHTML = formatter2.format(awords.map((x) => `<a href="${WIKTIONARY}${x}" target="_blank">${x}</a>`));

				cell = row.insertCell();
				cell.textContent = numberFormat.format(parseInt(num, 10));

				cell = row.insertCell();
				// cell.innerHTML = formatter1.format(forms.split(",").map((x) => words.has(x) ? `<a href="${WIKTIONARY}${x}" target="_blank">${x}</a>` : x));
				cell.textContent = formatter1.format(forms.split(","));

				cell = row.insertCell();
				cell.textContent = formatter2.format(pos.split(","));

				cell = row.insertCell();
				const awiki = wiki.split(/("[^"]+"|[^",]*)(?:,|$)/u).filter((x, i) => i % 2 !== 0).map((x) => x.startsWith('"') && x.endsWith('"') ? x.slice(1, -1) : x);
				cell.innerHTML = formatter1.format(awiki.map((x) => encodeXML(x)).map((x) => `<a href="${WIKIPEDIA}${x}" target="_blank">${x}</a>`));

				const test1 = awords.some((word) => /^[\p{Ll}'-]+$/u.test(word));
				const test2 = awords.some((word) => /^[\p{Alpha}'-]+$/u.test(word));
				const test3 = awords.some((word) => /\p{Ll}/u.test(word));
				const test4 = awords.some((word) => /\p{Alpha}/u.test(word));

				if (test1 && test3) {
					words1.add(row);
				}
				if (test2 && test3) {
					words2.add(row);
				}
				if (test2 && test4) {
					words3.add(row);
				}
				words4.add(row);

				if (awiki.length) {
					wikis.add(row);
				}
			}
		}

		wikt.replaceChildren(clone);

		settings();
	}).catch((error) => {
		console.error(error);

		wikt.textContent = `Error: ${error}`;
	});
});

for (const radio of awords) {
	radio.addEventListener("change", settings);
}

awiki.addEventListener("change", settings);
amax.addEventListener("change", settings);
