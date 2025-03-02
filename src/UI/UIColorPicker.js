import UISelection from "../JavascriptUI/UISelection"

export default class UIColorPicker extends UISelection {
    constructor(prop) {
        prop ??= {}
        super(prop)
        this.class = `ui colorpicker`
        this.selectHidden = true
        this.options = [
            { name: `Blue`, value: `Blue` },
            { name: `Aqua`, value: `Aqua` },
            { name: `Teal`, value: `Teal` },
            { name: `Purple`, value: `Purple` },
            { name: `Red`, value: `Red` },
            { name: `Fuchsia`, value: `Fuchsia` },
            { name: `Green`, value: `Green` },
            { name: `Lime`, value: `Lime` },
            { name: `Yellow`, value: `Yellow` },
            { name: `Gray`, value: `Gray` },
            { name: `White`, value: `White` },
        ]
        this.value ??= `Aqua`
    }
}
customElements.define(`ui-colorpicker`, UIColorPicker, { extends: `div` })