import UIButton from "../JavascriptUI/UIButton"
import UISelection from "../JavascriptUI/UISelection"
import UITemplate from "../JavascriptUI/UITemplate"
import UIText from "../JavascriptUI/UIText"
import { downloadObject } from "../download"
export default class FileBrowser extends UITemplate {
    static metadataKey = `EFIGenie.configuration.metadata.v1`
    static template = `
    <div class="fileSelectionToolbar"><div data-element="uploadButton"></div></div>
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
    uploadButton = new UIButton({ label: `Upload` })
    excludedKeys = []

    get metadata() {
        try { return JSON.parse(window.localStorage.getItem(FileBrowser.metadataKey)) ?? {} }
        catch { return {} }
    }

    markModified(key, modified = Date.now()) {
        if(!key || this.excludedKeys.includes(key)) return
        const metadata = this.metadata
        metadata[key] = modified
        window.localStorage.setItem(FileBrowser.metadataKey, JSON.stringify(metadata))
    }

    removeMetadata(key) {
        const metadata = this.metadata
        delete metadata[key]
        window.localStorage.setItem(FileBrowser.metadataKey, JSON.stringify(metadata))
    }

    constructor(prop) {
        super();
        this.Setup(prop) 
    }

    Setup(prop) {
        this.fileSelectionMenu = this.fileSelection.contextMenu
        this.fileSelectionMenu.class = `opened`
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
        const metadata = this.metadata
        this.fileSelection.options = Object.keys(window.localStorage)
            .filter(key => key !== FileBrowser.metadataKey && !this.excludedKeys.includes(key))
            .map(key => isValidJSON(window.localStorage.getItem(key))? { name: key, value: key, modified: metadata[key] } : undefined)
            .filter(x => x !== undefined)
        ;[...this.fileSelectionMenu.children].forEach(optionElement => {
            const option = optionElement._optionData
            if(!option) return
            const name = document.createElement(`span`)
            name.className = `file-name`
            name.textContent = option.name
            const modified = document.createElement(`span`)
            modified.className = `file-modified`
            modified.textContent = option.modified? new Date(option.modified).toLocaleString() : `Modified date unavailable`
            const download = new UIButton({ label: `\u2913`, class: `file-download` })
            download.title = `Download ${option.name}.json`
            download.setAttribute(`aria-label`, `Download ${option.name}.json`)
            download.addEventListener(`click`, event => {
                event.stopPropagation()
                const contents = window.localStorage.getItem(option.value)
                if(contents == undefined) return
                try { downloadObject(JSON.parse(contents), `${option.name}.json`) }
                catch { }
            })
            const remove = new UIButton({ label: `×`, class: `file-delete` })
            remove.title = `Delete ${option.name}`
            remove.setAttribute(`aria-label`, `Delete ${option.name}`)
            remove.addEventListener(`click`, event => {
                event.stopPropagation()
                if(!window.confirm(`Delete configuration "${option.name}"?`)) return
                window.localStorage.removeItem(option.value)
                this.removeMetadata(option.value)
                if(this.value === option.value) this.value = ``
                this.dispatchEvent(new CustomEvent(`filedelete`, { detail: { name: option.value } }))
                this.updateOptions()
            })
            optionElement.replaceChildren(name, modified, download, remove)
        })
    }
}
customElements.define(`file-browser`, FileBrowser, { extends: `span` })
