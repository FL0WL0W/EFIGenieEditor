import UITemplate from "../JavascriptUI/UITemplate"
import UIPinSelection from "../UI/UIPinSelection"
import UINumber from "../JavascriptUI/UINumber"
export default class Output_PWM extends UITemplate {
    static displayName = `PWM Pin`
    static inputTypes = [ `float`, `float` ]
    static template =   `<label>Pin:</label><div data-element="pin"></div>`

    pin = new UIPinSelection({ value: 0xFFFF, pinType: `pwmout` })
    minFrequency = new UINumber({
        value: 200
    })
    
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
customElements.define(`output-pwm`, Output_PWM, { extends: `span` })