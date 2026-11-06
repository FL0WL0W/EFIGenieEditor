import UITemplate from "../JavascriptUI/UITemplate"

// Expansion is view state: new messages open for editing; restored ones start closed.
export default class CANMessage extends UITemplate {
    #configurationsExpanded = true

    get configurationsExpanded() { return this.#configurationsExpanded }
    set configurationsExpanded(expanded) {
        this.#configurationsExpanded = Boolean(expanded)
        this.classList.toggle(`can-configurations-collapsed`, !this.#configurationsExpanded)
        this.dispatchEvent(new Event(`can-configuration-toggle`))
    }

    get saveValue() { return super.saveValue }
    set saveValue(value) {
        super.saveValue = value
        if(value != undefined)
            this.configurationsExpanded = false
    }
}
