import UITemplate from "../JavascriptUI/UITemplate"
import Input from "../Input/Input"
import UIDisplayLiveUpdate from "../UI/UIDisplayLiveUpdate"
import ConfigList from "./ConfigList"
//todo, context menu
export default class Inputs extends ConfigList {
    inputListElement = document.createElement(`div`)

    constructor(prop) {
        super({ ...prop,
            itemConstructor: Input,
            saveValue: [{}]
        })
        this.inputListNewElement = document.createElement(`div`)
        this.inputListNewElement.class = `w3-bar-subitem w3-button`
        this.inputListNewElement.textContent = `+ New`
        this.inputListNewElement.addEventListener(`click`, () => { this.appendNewItem() })
        this.addEventListener(`change`, () => {
            while([...this.children].filter(x => x.item.constructor === Input).length < this.inputListElement.children.length || this.inputListElement?.firstChild?.firstChild === this.inputListNewElement) this.inputListElement.removeChild(this.inputListElement.lastChild)
            for(let i = 0, iL = 0; i < this.children.length; i++){
                if(this.children[i].item.constructor !== Input)
                    continue
                let inputElement = this.inputListElement.children[iL++]
                if(!inputElement) {
                    inputElement = this.inputListElement.appendChild(document.createElement(`div`))
                    inputElement.appendChild(new UIDisplayLiveUpdate()).style.float = `right`
                    inputElement.append(document.createElement(`div`))
                    inputElement.class = `w3-bar-subitem w3-button`
                    const thisClass = this
                    inputElement.addEventListener(`click`, function() {
                        thisClass.children[this.inputIndex].scrollIntoView({
                            behavior: 'auto',
                            block: 'center',
                            inline: 'center'
                        })
                    })
                    inputElement.RegisterVariables = function() {
                        const input = thisClass.children[this.inputIndex]
                        this.firstChild.RegisterVariables({ name: `Inputs.${input.name.value}`, unit: input.translationConfig.outputUnits?.[0] ?? input.rawConfig.outputUnits?.[0] })
                    }
                }
                inputElement.inputIndex = i
                inputElement.lastChild.textContent = this.children[i].name.value
                inputElement.class = `w3-bar-subitem w3-button`
            }
            if(this.inputListElement.children.length === 0){
                let inputElement = this.inputListElement.appendChild(document.createElement(`div`))
                inputElement.appendChild(this.inputListNewElement)
            }
        })
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    RegisterVariables() {
        VariableRegister.CurrentTick = { name: `CurrentTick`, type: `tick`, id: VariableRegister.GenerateVariableId() }
        super.RegisterVariables()
        for(var i = 0; i < this.inputListElement.children.length; i++){
            this.inputListElement.children[i].RegisterVariables?.()
        }
    }
}
customElements.define('config-inputs', Inputs, { extends: `div` })