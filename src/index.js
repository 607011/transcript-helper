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
    const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345679ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ一丁丂七丄丅丆万丈三上下丌不与丏丐丑丒专且丕世丗丘丙业丛东丝丞丟丠両丢丣两严並丧丨丩个丫丬中丮丯丰丱串丳临丵丶丷丸丹为主丼丽举丿乀乁乂乃乄久乆乇么义乊之乌乍乎乏乐乑乒乓乔乕乖乗乘乙乚乛乜九乞也习乡乢乣乤乥书乧乨乩乪乫乬乭乮乯买乱乲乳乴乵乶乷乸乹乺乻乼乽乾乿亀亁亂亃亄亅了亇予争亊事二亍于亏亐云互亓五井亖亗亘亙亚些亜亝亞亟亠亡亢亣交亥亦产亨亩亪享京亭亮亯亰亱亲亳亴亵亶亷亸亹人亻亼亽亾亿什仁仂仃仄仅仆仇仈仉今介仌仍从仏仐仑仒仓仔仕他仗付仙仚仛仜仝仞仟仠仡仢代令以仦仧仨仩仪仫们仭仮仯仰仱仲仳仴仵件价仸仹仺任仼份仾仿伀企伂伃伄伅伆伇伈伉伊伋伌伍伎伏伐休伒伓伔伕伖众优伙会伛伜伝伞伟传伡伢伣伤伥伦伧伨伩伪伫伬伭伮伯估伱伲伳伴伵伶伷伸伹伺伻似伽伾伿佀佁佂佃佄佅但佇佈佉佊佋佌位低住佐佑佒体佔何佖佗佘余佚佛作佝佞佟你佡佢佣佤佥佦佧佨佩佪佫佬佭佮佯佰佱佲佳佴併佶佷佸佹佺佻佼佽佾使侀侁侂侃侄侅來侇侈侉侊例侌侍侎侏侐侑侒侓侔侕侖侗侘侙侚供侜依侞侟侠価侢侣侤侥侦侧侨侩侪侫侬侭侮侯侰侱侲侳侴侵侶侷侸侹侺侻侼侽侾便俀俁係促俄俅俆俇俈俉俊俋俌俍俎俏俐俑俒俓俔俕俖俗俘俙俚俛俜保俞俟俠信俢俣俤俥俦俧俨俩俪俫俬俭修俯俰俱俲俳俴俵俶俷俸俹俺俻俼俽俾俿';
    const SUPPORTED_TYPES = ['image/png', 'image/jpeg'];
    let undoHistory = new UndoHistory;

    function typeSymbol(symbolEl) {
        const clone = symbolEl.cloneNode(true);
        el.secretDoc.appendChild(clone);
        undoHistory.add(new Undoable(function () {
            clone.remove();
        }));
        localStorage.setItem(StorageKey.SecretDoc, el.secretDoc.innerHTML);
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
        for (const img of el.symbols.querySelectorAll('span')) {
            hashes[img.id] = SYMBOLS[idx++];
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
                    console.error(`Invalid symbol type: "${symbol.nodeName}"`);
                    break;
            }
            if (c) {
                transcript += c;
            }
        }
        el.transcript.textContent = transcript;
    }

    function main() {
        console.log('Transcript Helper. Copyright ©️ 2023 Oliver Lau');
        el.symbols = document.querySelector('#symbols');
        el.symbols.innerHTML = localStorage.getItem(StorageKey.Symbols) || '';
        el.symbols.addEventListener('dragenter', onSymbolDragEnter);
        el.symbols.addEventListener('dragover', onSymbolDragOver);
        el.symbols.addEventListener('dragleave', onSymbolDragLeave);
        el.symbols.addEventListener('drop', onSymbolDrop);
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
        document.querySelector('button#generate-transcript').addEventListener('click', generateTranscript);
        document.querySelector('button#cr').addEventListener('click', addCR);
        document.querySelector('button#space').addEventListener('click', addSpace);
        window.addEventListener('paste', onSymbolPaste);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('blur', onPageHide);
        window.addEventListener('keydown', onKeyDown);
    }
    document.querySelector(`input[name="direction"][value="${localStorage.getItem(StorageKey.Direction) || 'sideways-lr'}"]`).checked = true;
    window.addEventListener('load', main);
})(window);