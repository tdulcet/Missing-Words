"use strict";

const WIKTIONARY = "https://en.wiktionary.org/wiki/";
const WIKIPEDIA = "https://en.wikipedia.org/wiki/";

const wiktionary = [];

const numberFormat = new Intl.NumberFormat();

const numberFormat1 = new Intl.NumberFormat([], { style: "unit", unit: "second", unitDisplay: "long" });

const formatter1 = new Intl.ListFormat([], { style: "short" });
const formatter2 = new Intl.ListFormat([], { style: "narrow" });

const awords = Array.from(document.getElementsByName("words"));
const awiki = document.getElementById("wiki");
const asort = document.getElementById("sort");
const adirection = document.getElementById("direction");
const amax = document.getElementById("max");

const re1 = /^[\p{Ll}'-]+$/u;
const re2 = /^[\p{Alpha}'-]+$/u;
const re3 = /\p{Ll}/u;
const re4 = /\p{Alpha}/u;


function outputtime(time) {
	return numberFormat1.format(time / 1000);
}

function settings() {
	const label = "update";
	console.time(label);

	const start = performance.now();
	const table = document.getElementById("table");

	const words = parseInt(awords.find((r) => r.checked).value, 10);
	const wiki = awiki.checked;
	const sort = parseInt(asort.value, 10);
	const direction = adirection.checked;
	const max = amax.valueAsNumber;

	const rows = Array.from(wiktionary);

	if (sort >= 0) {
		let compare = null;

		switch (sort) {
			case 0:
			case 2:
			case 3:
			case 4:
				compare = direction ? (a, b) => a[sort][0]?.localeCompare(b[sort][0]) : (a, b) => b[sort][0]?.localeCompare(a[sort][0]);
				break;
			case 1:
				compare = direction ? (a, b) => a[sort] - b[sort] : (a, b) => b[sort] - a[sort];
				break;
		}

		rows.sort(compare);
	}

	console.timeLog(label);

	let test = null;

	switch (words) {
		case 1:
			test = (awords) => awords.some((word) => re1.test(word)) && awords.some((word) => re3.test(word));
			break;
		case 2:
			test = (awords) => awords.some((word) => re2.test(word)) && awords.some((word) => re3.test(word));
			break;
		case 3:
			test = (awords) => awords.some((word) => re2.test(word)) && awords.some((word) => re4.test(word));
			break;
		case 4:
			test = (awords) => true;
			break;
	}

	let count = 0;

	for (const [awords, anum, aforms, apos, awiki, row] of rows) {
		const show = test(awords) && (!wiki || awiki.length);
		row.style.display = show && count < max ? "" : "none";
		if (sort >= 0) {
			table.append(row);
		}
		if (show) {
			++count;
		}
	}


	console.timeLog(label);

	document.getElementById("total").textContent = `${numberFormat.format(count)} / ${numberFormat.format(rows.length)}${count > max ? ` (Only the first ${numberFormat.format(max)} shown)` : ""}`;

	const end = performance.now();
	const time = outputtime(end - start);
	document.getElementById("update").textContent = time;
	console.log(`The Wiktionary table was updated in ${time}.`);

	console.timeEnd(label);
}

function createlink(link) {
	const a = document.createElement("a");
	a.href = link;
	a.target = "_blank";
	return a;
}

addEventListener("load", async (event) => {
	const wikt = document.getElementById("wiktionary");

	wikt.textContent = "Loading…";

	const template = document.getElementById("awiktionary");
	const clone = template.content.cloneNode(true);

	const table = clone.getElementById("table");

	const label = "load";
	console.time(label);

	const start = performance.now();

	await fetch("wiktionary/Wiktionary words.tsv").then(async (response) => {
		if (response.ok) {
			const text = await response.text();
			// console.log(text);

			console.timeLog(label);

			const data = text.split("\n").filter((r) => r.length).map((r) => r.split("\t"));
			// console.log(data);

			console.timeLog(label);

			for (const [key, words, num, forms, pos, wiki] of data) {
				const row = table.insertRow();

				let cell = row.insertCell();
				const awords = words.split(",");
				cell.innerHTML = formatter2.format(awords.map((x) => {
					const link = createlink(`${WIKTIONARY}${x}`);
					link.textContent = x;
					return link.outerHTML;
				}));

				cell = row.insertCell();
				const anum = parseInt(num, 10);
				cell.textContent = numberFormat.format(anum);

				cell = row.insertCell();
				const aforms = forms.split(",");
				/* cell.innerHTML = formatter1.format(forms.split(",").map((x) => {
					if (words.has(x)) {
						const link = createlink(`${WIKTIONARY}${x}`);
						link.textContent = x;
						return link.outerHTML;
					}
					return x;
				})); */
				cell.textContent = formatter1.format(aforms);

				cell = row.insertCell();
				const apos = pos.split(",");
				cell.textContent = formatter2.format(apos);

				cell = row.insertCell();
				const awiki = wiki.split(/("[^"]+"|[^",]*)(?:,|$)/u).filter((x, i) => i % 2 !== 0).map((x) => x.startsWith('"') && x.endsWith('"') ? x.slice(1, -1) : x);
				cell.innerHTML = formatter1.format(awiki.map((x) => {
					const link = createlink(`${WIKIPEDIA}${x}`);
					link.textContent = x;
					return link.outerHTML;
				}));

				wiktionary.push([awords, anum, aforms, apos, awiki, row]);
			}
		}

		console.timeLog(label);

		wikt.replaceChildren(clone);

		const end = performance.now();
		const time = outputtime(end - start);
		document.getElementById("load").textContent = time;
		console.log(`The Wiktionary dictionary data was loaded in ${time}.`);

		console.timeLog(label);

		settings();
	}).catch((error) => {
		console.error(error);

		wikt.textContent = `Error: ${error}`;
	});

	console.timeEnd(label);
});

for (const radio of awords) {
	radio.addEventListener("change", settings);
}

awiki.addEventListener("change", settings);
asort.addEventListener("change", settings);
adirection.addEventListener("change", settings);
amax.addEventListener("change", settings);
