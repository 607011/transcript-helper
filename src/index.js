import('./static/js/spark-md5.min.js');
(function (window) {
    class Undoable {
        constructor(undoFunc) {
            this.undo = undoFunc;
        }
    }

    class UndoHistory {
        constructor(maxSteps = 500) {
            this.maxSteps = maxSteps;
            this.history = [];
        }
        add(undoable) {
            this.history.push(undoable);
            if (this.history.length > this.maxSteps) {
                this.history.shift();
            }
        }
        undo() {
            if (this.history.length === 0)
                return;
            this.history.pop().undo();
        }
    }

    class StorageKey {
        static Symbols = 'transcriptor.symbols';
        static SecretDoc = 'transcriptor.secretDoc';
        static Direction = 'transcriptor.direction';
    };
    const el = {};
    const SUPPORTED_TYPES = ['image/png', 'image/jpeg'];
    let undoHistory = new UndoHistory;

    function typeSymbol(symbolEl) {
        const clone = symbolEl.cloneNode(true);
        el.secretDoc.appendChild(clone);
        undoHistory.add(new Undoable(function () {
            clone.remove();
        }));
        localStorage.setItem(StorageKey.SecretDoc, el.secretDoc.innerHTML);
        generateTranscript();
    }

    function undo() {
        undoHistory.undo();
    }

    function saveAll() {
        localStorage.setItem(StorageKey.Symbols, el.symbols.innerHTML);
        localStorage.setItem(StorageKey.SecretDoc, el.secretDoc.innerHTML);
        localStorage.setItem(StorageKey.Direction, document.querySelector('input[name="direction"]:checked').value);
    }

    function onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            undo();
            saveAll();
            return e.preventDefault();
        }
    }

    function onPageHide(e) {
        saveAll();
    }

    function processItemAsSymbol(item) {
        if (item.kind === 'file' && SUPPORTED_TYPES.includes(item.type)) {
            const blob = item.getAsFile();
            const reader = new FileReader;
            reader.onload = function (event) {
                const id = SparkMD5.hash(event.target.result);
                if (el.symbols.querySelector(`[id="${id}"]`)) {
                    return;
                }
                const span = document.createElement('span');
                span.style.backgroundImage = `url('${event.target.result}')`;
                const img = new Image;
                img.onload = () => {
                    span.style.width = `calc(var(--symbol-scale) * ${img.naturalWidth}px)`;
                    span.style.height = `calc(var(--symbol-scale) * ${img.naturalHeight}px)`;
                };
                img.src = event.target.result;
                span.id = id;
                span.addEventListener('click', () => {
                    typeSymbol(span);
                });
                el.symbols.appendChild(span);
                el.numSymbols.textContent = el.symbols.childNodes.length;
                undoHistory.add(new Undoable(function () {
                    span.remove();
                }));
                localStorage.setItem(StorageKey.Symbols, el.symbols.innerHTML);
            };
            reader.readAsDataURL(blob);
        }
    }

    function addCR() {
        el.secretDoc.appendChild(document.createElement('br'));
    }

    function addSpace() {
        el.secretDoc.appendChild(document.createTextNode(' '));
    }

    function onAlphabetChange() {
        generateTranscript();
    }

    function onSymbolPaste(e) {
        const clipboardData = (e.clipboardData || window.clipboardData);
        for (const item of clipboardData.items) {
            processItemAsSymbol(item);
        }
        e.preventDefault();
        return false;
    }

    function onSymbolDragEnter(e) {
        e.dataTransfer.dropEffect = 'copy';
        el.symbols.classList.add('dragging');
    }

    function onSymbolDragLeave(_e) {
        el.symbols.classList.remove('dragging');
    }

    function onSymbolDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function onSymbolDrop(e) {
        for (const item of e.dataTransfer.items) {
            processItemAsSymbol(item);
        }
        el.symbols.classList.remove('dragging');
        e.preventDefault();
    }

    function generateTranscript() {
        const hashes = {};
        let idx = 0;
        const alphabet = el.alphabet.value;
        for (const img of el.secretDoc.querySelectorAll('span')) {
            if (!Object.keys(hashes).includes(img.id)) {
                hashes[img.id] = String.fromCodePoint(alphabet.codePointAt(idx++));
            }
        }
        let transcript = '';
        for (const symbol of el.secretDoc.childNodes) {
            let c;
            switch (symbol.nodeName) {
                case 'SPAN':
                    c = hashes[symbol.id];
                    break;
                case 'BR':
                    c = '\n';
                    break;
                case '#text':
                    c = symbol.nodeValue;
                    break;
                default:
                    console.warn(`Invalid symbol type: "${symbol.nodeName}"`, symbol);
                    break;
            }
            if (c) {
                transcript += c;
            }
        }
        el.numDifferentSymbols.textContent = idx;
        el.transcript.value = transcript;
        el.alphabetUsed.textContent = Object.values(hashes).sort().join('');
        console.assert(idx === Object.keys(hashes).length);
    }

    function main() {
        console.log('Transcript Helper. Copyright ©️ 2023 Oliver Lau');
        el.symbols = document.querySelector('#symbols');
        el.symbols.innerHTML = localStorage.getItem(StorageKey.Symbols) || '';
        el.symbols.addEventListener('dragenter', onSymbolDragEnter);
        el.symbols.addEventListener('dragover', onSymbolDragOver);
        el.symbols.addEventListener('dragleave', onSymbolDragLeave);
        el.symbols.addEventListener('drop', onSymbolDrop);
        el.numSymbols = document.querySelector('#num-symbols');
        el.numSymbols.textContent = el.symbols.childNodes.length
        el.numDifferentSymbols = document.querySelector('#num-different-symbols');
        el.alphabet = document.querySelector('#alphabet');
        el.alphabet.addEventListener('input', onAlphabetChange);
        el.alphabetUsed = document.querySelector('#alphabet-used');
        el.secretDoc = document.querySelector('#secret-doc');
        el.secretDoc.innerHTML = localStorage.getItem(StorageKey.SecretDoc) || '';
        el.secretDoc.setAttribute('contenteditable', true);
        el.directionForm = document.querySelector('#direction');
        el.directionForm.addEventListener('submit', e => {
            e.preventDefault();
            return false;
        });
        el.secretDoc.style.setProperty('writing-mode', localStorage.getItem(StorageKey.Direction) || 'initial');
        for (const radioButton of document.querySelectorAll('input[name="direction"]')) {
            radioButton.addEventListener('click', e => {
                el.secretDoc.style.setProperty('writing-mode', e.target.value);
                localStorage.setItem(StorageKey.Direction, e.target.value);
            });
        }
        el.transcript = document.querySelector('#transcript');
        for (const node of el.symbols.children) {
            node.addEventListener('click', () => {
                typeSymbol(node);
            });
        }
        // document.querySelector('button#generate-transcript').addEventListener('click', generateTranscript);
        document.querySelector('button#cr').addEventListener('click', addCR);
        document.querySelector('button#space').addEventListener('click', addSpace);
        window.addEventListener('paste', onSymbolPaste);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('blur', onPageHide);
        window.addEventListener('keydown', onKeyDown);
        generateTranscript();
    }
    document.querySelector(`input[name="direction"][value="${localStorage.getItem(StorageKey.Direction) || 'sideways-lr'}"]`).checked = true;
    window.addEventListener('load', main);
})(window);