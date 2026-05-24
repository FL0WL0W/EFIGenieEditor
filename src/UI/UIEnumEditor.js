import UITemplate from "../JavascriptUI/UITemplate"
import UIText from "../JavascriptUI/UIText"
import UINumber from "../JavascriptUI/UINumber"
import ConfigList from "../Top/ConfigList"

class UIEnumEntry extends UITemplate {
    static template = `<div data-element="value"></div><div data-element="label"></div>`

    value = new UINumber({ class: `enumEntryValue`, type: `number` })
    label = new UIText({ class: `enumEntryLabel` })

    constructor(prop) {
        super()
        this.Setup(prop)
    }
}
customElements.define(`ui-enum-entry`, UIEnumEntry, { extends: `span` })

class UIEnum extends UITemplate {
    static template = `<div class="enumRow"><span data-element="name"></span><button class="enumToggle"></button><span data-element="entries"></span></div>`

    name = new UIText({ class: `enumName` })
    entries = (() => {
        const list = new ConfigList({
            itemConstructor: UIEnumEntry,
            saveValue: [],
            class: `configContainer`
        })

        const usedValues = () => new Set([...list.children].map(c => c.item.value.value))
        const nextAvailableFrom = (start, excluding) => {
            let v = start
            while (excluding.has(v)) v++
            return v
        }

        list.newItem = () => new UIEnumEntry()

        const _appendNewItem = list.appendNewItem.bind(list)
        list.appendNewItem = (item, before) => {
            item = item ?? new UIEnumEntry()
            if (isNaN(item.value.value)) {
                const taken = usedValues()
                const prevContainer = before ? before.previousSibling : list.lastChild
                const prevValue = prevContainer?.item?.value?.value
                const start = !isNaN(prevValue) ? prevValue + 1 : 0
                item.value.value = nextAvailableFrom(start, taken)
            }
            _appendNewItem(item, before)
            const addedContainer = before ? before.previousSibling : list.lastChild
            addedContainer?.item?.label?.focus()
        }

        list.addEventListener(`change`, () => {
            const seen = new Map()
            ;[...list.children].forEach(container => {
                const valueInput = container.item.value
                const v = valueInput.value
                if (seen.has(v)) {
                    const taken = usedValues()
                    valueInput.value = nextAvailableFrom(v + 1, taken)
                } else {
                    seen.set(v, container)
                }
            })
        })

        return list
    })()

    constructor(prop) {
        super()
        this.Setup(prop)
    }

    connectedCallback() {
        this.entries.updateControls()
        const toggle = this.querySelector(`.enumToggle`)
        this.entries.hidden = true
        toggle.addEventListener(`click`, () => {
            this.entries.hidden = !this.entries.hidden
            toggle.classList.toggle(`enumToggle--open`, !this.entries.hidden)
        })
    }
}
customElements.define(`ui-enum`, UIEnum, { extends: `span` })

export default class UIEnumEditor extends UITemplate {
    static template = `<div data-element="enumList"></div>`

    #syncing = false

    enumList = new ConfigList({
        itemConstructor: UIEnum,
        saveValue: [],
        class: `configContainer`
    })

    constructor(prop) {
        super()
        this.Setup(prop)
        this.class = `itemContainer`

        window.EnumRegister.addEventListener(`change`, () => this.#syncFromRegistry())
        this.enumList.addEventListener(`change`, () => this.#syncToRegistry())

        this.#syncFromRegistry()
    }

    #syncFromRegistry() {
        if (this.#syncing) return
        this.#syncing = true
        this.enumList.saveValue = window.EnumRegister.names.map(name => ({
            name: name,
            entries: window.EnumRegister.getEnum(name)
        }))
        this.#syncing = false
    }

    addNewEnum() {
        this.enumList.appendNewItem()
        const lastContainer = this.enumList.lastChild
        lastContainer?.item?.name?.focus()
    }

    #syncToRegistry() {
        if (this.#syncing) return
        this.#syncing = true
        const currentNames = new Set()
        ;[...this.enumList.children].forEach(container => {
            const item = container.item
            const name = item.name.value?.trim()
            if (!name) return
            currentNames.add(name)
            const entries = [...item.entries.children].map(ec => ({
                value: ec.item.value.value,
                label: ec.item.label.value
            }))
            window.EnumRegister.setEnum(name, entries)
        })
        window.EnumRegister.names.forEach(name => {
            if (!currentNames.has(name)) window.EnumRegister.deleteEnum(name)
        })
        this.#syncing = false
    }
}
customElements.define(`ui-enum-editor`, UIEnumEditor, { extends: `span` })

