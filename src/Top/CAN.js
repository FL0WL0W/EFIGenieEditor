import ConfigList from "./ConfigList"
import GenericCalculation from "../Calculation/GenericCalculation"
import CANConfigs from "../CAN/CANConfigs"
import GenericConfigs from "../Calculation/GenericConfigs"
//todo, context menu
export default class CAN extends ConfigList {
    tabListElement = document.createElement(`div`)

    constructor(prop) {
        super({ ...prop,
            newItem() { return new GenericCalculation({ calculations: [ {group: `CAN`, calculations: CANConfigs}, {group: `Generic`, calculations: GenericConfigs} ]  }) }
        })
        this.canListNewElement = document.createElement(`div`)
        this.canListNewElement.class = `w3-bar-subitem w3-button`
        this.canListNewElement.textContent = `+ New`
        this.canListNewElement.addEventListener(`click`, () => { this.appendNewItem() })
        this.addEventListener(`change`, () => {
            while([...this.children].filter(x => x?.item?.constructor === GenericCalculation).length < this.tabListElement.children.length || this.tabListElement?.firstChild?.firstChild === this.canListNewElement) this.tabListElement.removeChild(this.tabListElement.lastChild)
            for(let i = 0, iL = 0; i < this.children.length; i++){
                if(this.children[i].item.constructor !== GenericCalculation)
                    continue
                let canElement = this.tabListElement.children[iL++]
                if(!canElement) {
                    canElement = this.tabListElement.appendChild(document.createElement(`div`))
                    canElement.append(document.createElement(`div`))
                    canElement.class = `w3-bar-subitem w3-button`
                    const thisClass = this
                    canElement.addEventListener(`click`, function() {
                        thisClass.children[this.canIndex].scrollIntoView({
                            behavior: 'auto',
                            block: 'center',
                            inline: 'center'
                        })
                    })
                }
                canElement.canIndex = i
                canElement.lastChild.textContent = this.children[i].name.value
                canElement.class = `w3-bar-subitem w3-button`
            }
            if(this.tabListElement.children.length === 0){
                let canElement = this.tabListElement.appendChild(document.createElement(`div`))
                canElement.appendChild(this.canListNewElement)
            }
        })
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }
}
customElements.define('config-can', CAN, { extends: `div` })