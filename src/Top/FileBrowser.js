import UIButton from "../JavascriptUI/UIButton"
import UIDialog from "../JavascriptUI/UIDialog"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import UIText from "../JavascriptUI/UIText"
export default class FileBrowser extends UITemplate {
    static template = `
    <div class="fileSelectionMenu"><div data-element="fileSelectionMenu"></div></div>
    <div class="fileSelectionActions">
        <div data-element="valueElement"></div>
        <div data-element="actionButton"></div>
    </div>`

    get actionLabel() { return this.actionButton.label }
    set actionLabel(actionLabel) { this.actionButton.label = actionLabel}
    get value() { return this.valueElement.value }
    set value(value) {  this.valueElement.value = value }

    fileSelection = new UISelection({
        selectHidden: true
    })
    valueElement = new UIText()
    actionButton = new UIButton({
        label:          `Open`,
    })

    constructor(prop) {
        super();
        this.Setup(prop) 
    }

    Setup(prop) {
        this.contextMenuElement = document.createElement(`div`)
        this.contextMenuElement.class = `ui context-menu`
        const deleteElement = this.contextMenuElement.appendChild(document.createElement(`div`))
        deleteElement.class = `selectoption collapsed`
        deleteElement.innerText = `Delete`
        deleteElement.addEventListener('click', (event) => {
            window.localStorage.removeItem(this.fileSelection.value)
            this.updateOptions();
        })
        this.fileSelectionMenu = this.fileSelection.contextMenuElement
        let visible = false
        let collapsingClick = false
        let currentTarget = undefined
        this.fileSelectionMenu.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.target.dispatchEvent(new Event(`click`, {bubbles: true}))

            const clickHandler = () => {
                if(collapsingClick)
                    return collapsingClick = false
                if(!visible) 
                    return
                currentTarget?.removeChild?.(this.contextMenuElement)
                document.removeEventListener(`click`, clickHandler)
                visible = false
            }
            document.addEventListener(`click`, clickHandler)
            window.setTimeout(() => { currentTarget = event.target; currentTarget.append(this.contextMenuElement); visible = true }, 1)
        });
        this.fileSelectionMenu.class = `openned`
        this.fileSelection.addEventListener(`change`, () => {
            this.valueElement.value = this.fileSelection.value
        })
        this.valueElement.addEventListener(`change`, () => {
            this.fileSelection.value = this.valueElement.value
        })
        super.Setup(prop)
        this.updateOptions()
        this.class = `filebrowser`
    }

    updateOptions() {
        function isValidJSON(str) {
            try {
                return typeof JSON.parse(str) === `object`
            } catch (e) {
                return false;
            }
        }
        this.fileSelection.options = Object.keys(window.localStorage).map((key) => { return isValidJSON(window.localStorage.getItem(key))? { name: key, value: key } : undefined }).filter(x => x !== undefined)
    }
}
customElements.define(`file-browser`, FileBrowser, { extends: `span` })