import UISelection from "../JavascriptUI/UISelection"
export default class UIPinSelection extends UISelection {
    constructor(prop){
        super(prop)
        this.selectDisabled = prop.selectDisabled ?? true
        this.selectValue = prop.selectValue ?? 0xFFFF
        
        this.classList.add(`pinselect`)
    }

    wtf = 1
    
    updateOptions(pinOut) {
        var options = []
        var endOptions = []
        if(!pinOut) return
        for(var i = 0; i < pinOut.Pins.length; i++) {
            const selected = this.value === pinOut.Pins[i].value
            if(pinOut.Pins[i].supportedModes.split(` `). indexOf(this.pinType) === -1) {
                endOptions.push({
                    name: pinOut.Pins[i].name,
                    value: pinOut.Pins[i].value,
                    class: selected? `incompatible` : undefined,
                    disabled: true
                })
            } else {
                options.push({
                    name: pinOut.Pins[i].name,
                    value: pinOut.Pins[i].value
                })
            }
        }
        options = options.concat(endOptions)

        this.options = options
    }
}
customElements.define('ui-pinselection', UIPinSelection, { extends: `div` })