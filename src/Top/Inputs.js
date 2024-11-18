import UITemplate from "../JavascriptUI/UITemplate"
import Input from "../Input/Input"
import UIPinOverlay from "../UI/UIPinOverlay"
import UIDisplayLiveUpdate from "../UI/UIDisplayLiveUpdate"
import UISelection from "../JavascriptUI/UISelection"
import ConfigList from "./ConfigList"
import Pinouts from "../Pinouts/Pinouts"
//todo, context menu
export default class Inputs extends UITemplate {
    static template = `<div style="block-size: fit-content; width: fit-content;"><div data-element="inputs"></div><div data-element="newInputElement"></div></div><div data-element="pinOverlay"></div>`
    inputListElement = document.createElement(`div`)
    targetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } }),
        value: `ESP32C6_Expander`
    })
    pinOverlay = new UIPinOverlay()
    inputs = new ConfigList({
        itemConstructor: Input,
        saveValue: [{}]
    })

    constructor(prop) {
        super()
        this.inputListNewElement = document.createElement(`div`)
        this.inputListNewElement.class = `w3-bar-subitem w3-button`
        this.inputListNewElement.textContent = `+ New`
        this.inputListNewElement.addEventListener(`click`, () => { this.inputs.appendNewItem() })
        this.addEventListener(`change`, () => {
            while([...this.inputs.children].filter(x => x.item.constructor === Input).length < this.inputListElement.children.length || this.inputListElement?.firstChild?.firstChild === this.inputListNewElement) this.inputListElement.removeChild(this.inputListElement.lastChild)
            for(let i = 0, iL = 0; i < this.inputs.children.length; i++){
                if(this.inputs.children[i].item.constructor !== Input)
                    continue
                let inputElement = this.inputListElement.children[iL++]
                if(!inputElement) {
                    inputElement = this.inputListElement.appendChild(document.createElement(`div`))
                    inputElement.appendChild(new UIDisplayLiveUpdate()).style.float = `right`
                    inputElement.append(document.createElement(`div`))
                    inputElement.class = `w3-bar-subitem w3-button`
                    const thisClass = this
                    inputElement.addEventListener(`click`, function() {
                        thisClass.inputs.children[this.inputIndex].scrollIntoView({
                            behavior: 'auto',
                            block: 'center',
                            inline: 'center'
                        })
                    })
                    inputElement.RegisterVariables = function() {
                        const input = thisClass.inputs.children[this.inputIndex]
                        this.firstChild.RegisterVariables({ name: `Inputs.${input.name.value}`, unit: input.translationConfig.outputUnits?.[0] ?? input.rawConfig.outputUnits?.[0] })
                    }
                }
                inputElement.inputIndex = i
                inputElement.lastChild.textContent = this.inputs.children[i].name.value
                inputElement.class = `w3-bar-subitem w3-button`
            }
            if(this.inputListElement.children.length === 0){
                let inputElement = this.inputListElement.appendChild(document.createElement(`div`))
                inputElement.appendChild(this.inputListNewElement)
            }
        })
        this.targetDevice.addEventListener(`change`, () => { 
            this.pinOverlay.pinOut = Pinouts[this.targetDevice.value]
        })
        this.pinOverlay.pinOut = Pinouts[this.targetDevice.value]
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
        this.Setup(prop)
    }

    RegisterVariables() {
        VariableRegister.CurrentTick = { name: `CurrentTick`, type: `tick`, id: VariableRegister.GenerateVariableId() }
        this.inputs.RegisterVariables()
        for(var i = 0; i < this.inputListElement.children.length; i++){
            this.inputListElement.children[i].RegisterVariables?.()
        }
        this.pinOverlay.update();
    }
}
customElements.define('config-inputs', Inputs, { extends: `span` })