/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface ImageLoadStrategy {
    load(href: string): void;
}

class NetworkImageLoadStrategy implements ImageLoadStrategy {
    load(href: string): void {
        console.log(`[Strategy]: Завантаження з МЕРЕЖІ: ${href}`);
    }
}

class FileSystemImageLoadStrategy implements ImageLoadStrategy {
    load(href: string): void {
        console.log(`[Strategy]: Читання з ДИСКУ: ${href}`);
    }
}

// ===============  state ============================
interface NodeState {
    render(node: LightNode): string;
}

class VisibleState implements NodeState {
    render(node: LightNode): string {
        return node.getOuterHTMLInternal();
    }
}

class HiddenState implements NodeState {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render(node: LightNode): string {
        return '';
    }
}

// template + iterator
abstract class LightNode {
    protected state: NodeState = new VisibleState();

    private eventListeners: Map<string, Function[]> = new Map();
    constructor() {
        setTimeout(() => this.onCreated(), 0);
    }
    //======= template ===============
    protected abstract onCreated(): void;
    protected abstract onBeforeRender(): void;

    public render(): string {
        this.onBeforeRender();
        return this.state.render(this);
    }

    public setState(state: NodeState) {
        this.state = state;
    }

    abstract getInnerHTML(): string;
    abstract getOuterHTMLInternal(): string;

    public addEventListener(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
        this.eventListeners.get(event)?.push(callback);
    }

    public triggerEvent(event: string, data?: any): void {
        this.eventListeners.get(event)?.forEach(cb => cb(data));
    }

    public *getIterator(): IterableIterator<LightNode> {
        yield this;
    }
}

class LightTextNode extends LightNode {
    constructor(public text: string) {
        super();
        this.onCreated();
    }

    protected onCreated(): void {
        console.log(`[Lifecycle]: TextNode created: "${this.text.substring(0, 10)}..."`);
    }

    protected onBeforeRender(): void {}

    getOuterHTMLInternal() {
        return this.text;
    }
    getInnerHTML() {
        return this.text;
    }
}

class LightElementNode extends LightNode {
    public children: LightNode[] = [];

    constructor(
        public tagName: string,
        public displayType: 'block' | 'inline',
        public isSelfClosing: boolean,
        public classes: string[] = [],
    ) {
        super();
        this.onCreated();
    }

    protected onCreated(): void {
        console.log(`[Lifecycle]: Element <${this.tagName}> created.`);
    }

    protected onBeforeRender(): void {
        console.log(`[Lifecycle]: Rendering <${this.tagName}>...`);
    }

    addChild(node: LightNode) {
        this.children.push(node);
    }

    getInnerHTML(): string {
        return this.children.map(c => c.render()).join('');
    }

    getOuterHTMLInternal(): string {
        const classAttr = this.classes.length ? ` class="${this.classes.join(' ')}"` : '';
        if (this.isSelfClosing) return `<${this.tagName}${classAttr}/>`;
        return `<${this.tagName}${classAttr}>${this.getInnerHTML()}</${this.tagName}>`;
    }

    public *getIterator(): IterableIterator<LightNode> {
        yield this;
        for (const child of this.children) {
            yield* child.getIterator();
        }
    }
}

class LightImageNode extends LightElementNode {
    private loadStrategy: ImageLoadStrategy;
    constructor(public href: string) {
        super('img', 'inline', true);
        this.loadStrategy = href.startsWith('http') ? new NetworkImageLoadStrategy() : new FileSystemImageLoadStrategy();
        this.loadStrategy.load(this.href);
    }
    getOuterHTMLInternal(): string {
        return `<img src="${this.href}" />`;
    }
}

function main() {
    console.log('=== check template ===');
    const body = new LightElementNode('body', 'block', false);
    const div = new LightElementNode('div', 'block', false, ['container']);
    const text = new LightTextNode('Hello, patterns!');
    const img = new LightImageNode('https://example.com/logo.png');

    body.addChild(div);
    div.addChild(text);
    div.addChild(img);

    console.log('\n=== check iterator ===');
    for (const node of body.getIterator()) {
        if (node instanceof LightElementNode) {
            console.log(`Founded tag: <${node.tagName}>`);
        }
    }

    console.log('\n=== check State ===');
    console.log('visible div:', div.render());
    div.setState(new HiddenState());
    console.log('hidden div(must be nothing):', div.render());
    console.log('\n');
    console.log(body.render());
}
main();
