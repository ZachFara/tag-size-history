// Minimal stand-in for the parts of Obsidian's API that the UI modules touch.

interface CreateOptions {
	cls?: string;
	text?: string;
	type?: string;
	placeholder?: string;
}

interface WithCreateEl {
	createEl(tag: string, o?: CreateOptions): HTMLElement;
}

/** Obsidian adds these helpers to every HTMLElement. */
export function installDomHelpers(win: Window & typeof globalThis): void {
	Object.assign(win.HTMLElement.prototype, {
		empty(this: HTMLElement): void {
			this.replaceChildren();
		},
		addClass(this: HTMLElement, cls: string): void {
			this.classList.add(cls);
		},
		toggleClass(this: HTMLElement, cls: string, on: boolean): void {
			this.classList.toggle(cls, on);
		},
		setText(this: HTMLElement, text: string): void {
			this.textContent = text;
		},
		createEl(this: HTMLElement, tag: string, o: CreateOptions = {}): HTMLElement {
			const el = this.ownerDocument.createElement(tag);
			if (o.cls) el.className = o.cls;
			if (o.text) el.textContent = o.text;
			if (o.type) el.setAttribute("type", o.type);
			if (o.placeholder) el.setAttribute("placeholder", o.placeholder);
			this.appendChild(el);
			return el;
		},
		createDiv(this: HTMLElement & WithCreateEl, o?: CreateOptions): HTMLElement {
			return this.createEl("div", o);
		},
		createSpan(this: HTMLElement & WithCreateEl, o?: CreateOptions): HTMLElement {
			return this.createEl("span", o);
		},
	});
}

/** A modal that attaches itself to the document on open, as Obsidian's does. */
export class Modal {
	app: unknown;
	modalEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(app: unknown) {
		this.app = app;
		this.modalEl = document.createElement("div");
		this.modalEl.className = "modal";
		this.contentEl = this.modalEl.appendChild(document.createElement("div"));
	}

	open(): void {
		document.body.appendChild(this.modalEl);
		this.onOpen();
	}

	close(): void {
		this.onClose();
		this.modalEl.remove();
	}

	onOpen(): void {
		// overridden by the modal under test
	}

	onClose(): void {
		// overridden by the modal under test
	}
}

/** The base of a settings tab. Obsidian draws the tab from `getSettingDefinitions`; the tests read them directly. */
export class PluginSettingTab {
	app: unknown;
	/** How often the tab was asked to re-evaluate which settings are visible. */
	refreshes = 0;

	constructor(app: unknown, _plugin: unknown) {
		this.app = app;
	}

	refreshDomState(): void {
		this.refreshes += 1;
	}
}
