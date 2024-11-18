import UITemplate from "../JavascriptUI/UITemplate"
import UIPinSelection from "../UI/UIPinSelection"
import UICheckBox from "../JavascriptUI/UICheckBox"
import BooleanOutputConfigs from "./BooleanOutputConfigs"
export default class Output_Digital extends UITemplate {
    static displayName = `Digital Pin`
    static inputTypes = [ `bool` ]
    static template =   `<label>Pin:</label><div data-element="pin"></div><div data-element="inverted"></div>Inverted <div data-element="highZ"></div>High Z`

    pin = new UIPinSelection({ value: 0xFFFF, pinType: `digitalout` })
    
    constructor(prop){
        super()
        this.inverted = new UICheckBox()
        this.highZ = new UICheckBox()
        this.style.display = `block`
        this.Setup(prop)
    }
}
BooleanOutputConfigs.push(Output_Digital)
customElements.define(`output-digital`, Output_Digital, { extends: `span` })