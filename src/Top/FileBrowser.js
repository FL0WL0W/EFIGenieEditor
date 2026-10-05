import UIButton from "../JavascriptUI/UIButton"
import UICheckBox from "../JavascriptUI/UICheckBox"
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
    fileProvider
    downloadFile
    deleteFile
    visibilityChanged
    fileType = `configuration`
    showFileActions = true
    #updatingSelectionText = false

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
            this.#updatingSelectionText = true
            this.valueElement.value = this.fileSelection.selectedOption?.name ?? this.fileSelection.value
            this.#updatingSelectionText = false
        })
        this.valueElement.addEventListener(`change`, () => {
            if(this.#updatingSelectionText) return
            this.fileSelection.value = this.valueElement.value
        })
        super.Setup(prop)
        this.querySelector(`.fileSelectionActions`).hidden = !this.showFileActions
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
        let files
        if(this.fileProvider) {
            files = this.fileProvider() ?? []
        } else {
            const metadata = this.metadata
            files = Object.keys(window.localStorage)
                .filter(key => key !== FileBrowser.metadataKey && !this.excludedKeys.includes(key))
                .map(key => isValidJSON(window.localStorage.getItem(key))? { name: key, value: key, modified: metadata[key] } : undefined)
                .filter(x => x !== undefined)
        }
        this.fileSelection.options = files
        ;[...this.fileSelectionMenu.children].forEach(optionElement => {
            const option = optionElement._optionData
            if(!option) return
            const name = document.createElement(`span`)
            name.className = `file-name`
            name.textContent = option.name
            const modified = document.createElement(`span`)
            modified.className = `file-modified`
            modified.textContent = option.modified? new Date(option.modified).toLocaleString() : `Modified date unavailable`
            const controls = []
            if(typeof option.visible === `boolean`) {
                optionElement.classList.add(`has-visibility`)
                const visible = new UICheckBox({ value: option.visible })
                visible.disabled = option.visibilityDisabled === true
                visible.title = option.visible? `Visible` : `Hidden`
                visible.setAttribute(`aria-label`, `${option.name} visible`)
                visible.addEventListener(`click`, event => event.stopPropagation())
                visible.addEventListener(`change`, event => {
                    event.stopPropagation()
                    if(this.visibilityChanged?.(option, visible.value) === false)
                        visible.value = option.visible
                })
                controls.push(visible)
            } else {
                optionElement.classList.remove(`has-visibility`)
            }
            controls.push(name, modified)
            const download = new UIButton({ label: `\u2913`, class: `file-download` })
            download.title = `Download ${option.name}.json`
            download.setAttribute(`aria-label`, `Download ${option.name}.json`)
            download.addEventListener(`click`, event => {
                event.stopPropagation()
                if(this.downloadFile) {
                    this.downloadFile(option)
                    return
                }
                const contents = window.localStorage.getItem(option.value)
                if(contents == undefined) return
                try { downloadObject(JSON.parse(contents), `${option.name}.json`) }
                catch { }
            })
            controls.push(download)
            if(option.deletable !== false) {
                const remove = new UIButton({ label: `×`, class: `file-delete` })
                remove.title = `Delete ${option.name}`
                remove.setAttribute(`aria-label`, `Delete ${option.name}`)
                remove.addEventListener(`click`, event => {
                    event.stopPropagation()
                    if(!window.confirm(`Delete ${this.fileType} "${option.name}"?`)) return
                    if(this.deleteFile) {
                        if(this.deleteFile(option) === false) return
                    } else {
                        window.localStorage.removeItem(option.value)
                        this.removeMetadata(option.value)
                    }
                    if(this.fileSelection.value === option.value) this.value = ``
                    this.dispatchEvent(new CustomEvent(`filedelete`, { detail: { name: option.value } }))
                    this.updateOptions()
                })
                controls.push(remove)
            } else {
                controls.push(document.createElement(`span`))
            }
            optionElement.replaceChildren(...controls)
        })
    }
}
customElements.define(`file-browser`, FileBrowser, { extends: `span` })
