import UITemplate from "../JavascriptUI/UITemplate"
import UIButton from "../JavascriptUI/UIButton"
import Dashboard from "./Dashboard"
import Engine from "./Engine"
import Ignition from "./Ignition"
import Fuel from "./Fuel"
import Inputs from "./Inputs"
import CAN from "./CAN"
import UIPinOverlay from "../UI/UIPinOverlay"
import { communication } from "../communication"
import UISelection from "../JavascriptUI/UISelection"
import Pinouts from "../Pinouts/Pinouts"

export default class Top extends UITemplate {
    static template = 
`<div class="w3-sidebar" style="display: none;">
    <div class="w3-bar">
        <div class="w3-bar-item w3-padding-16">EFIGenie</div>
        <div data-element="sidebarClose"></div>
    </div>
    <div class="w3-bar-block sidebarSelection">
        <div data-element="dashboardTab"></div>
        <div data-element="pinOverlayTab"></div>
        <div data-element="inputsTab"></div>
        <div data-element="inputsTabList"></div>
        <div data-element="canTab"></div>
        <div data-element="canTabList"></div>
        <div data-element="engineTab"></div>
        <div data-element="fuelTab"></div>
        <div data-element="ignitionTab"></div>
    </div>
</div>
<div class="w3-container w3-display-container">
    <span>
        <div data-element="sidebarOpen"></div>
        <div data-element="title"></div>
    </span>
    <hr style="margin: 0px 0px 5px 0px;">
    <div data-element="Dashboard"></div>
    <div data-element="pinOverlayWorkspace"></div>
    <div data-element="inputsWorkspace"></div>
    <div data-element="canWorkspace"></div>
    <div data-element="Engine"></div>
    <div data-element="Fuel"></div>
    <div data-element="Ignition"></div>
</div>`

    title = document.createElement(`div`)
    dashboardTab = document.createElement(`div`)
    pinOverlayTab = document.createElement(`div`)
    inputsTabExpend = document.createElement(`span`)
    inputsTab = document.createElement(`div`)
    canTabExpend = document.createElement(`span`)
    canTab = document.createElement(`div`)
    engineTab = document.createElement(`div`)
    fuelTab = document.createElement(`div`)
    ignitionTab = document.createElement(`div`)

    pinOverlayWorkspace = document.createElement(`span`)
    inputsWorkspace = document.createElement(`span`)
    canWorkspace = document.createElement(`div`)

    Dashboard = new Dashboard()
    PinOverlay = new UIPinOverlay()
    TargetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } }),
        value: `ESP32C6_Expander`
    })
    Inputs = new Inputs()
    CAN = new CAN();
    Engine = new Engine()
    Fuel = new Fuel()
    Ignition = new Ignition()
    sidebarClose = new UIButton({className: `sidebaropenclose w3-button w3-padding-16 w3-right`})
    sidebarOpen = new UIButton({className: `sidebaropenclose w3-button w3-padding-16`})
    constructor(prop){
        super()
        this.inputsWorkspace.append(this.Inputs)
        this.canWorkspace.append(this.CAN.newItemElement)
        this.canWorkspace.append(this.CAN)
        this.pinOverlayWorkspace.append(this.PinOverlay)
        this.TargetDevice.addEventListener(`change`, () => { 
            this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
        })
        this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
        this.class = "top"
        // this.Engine.addEventListener(`change`, () => {
        //     if(this.Engine.value.find(x => Object.keys(x)[0] === `EngineCalculations`).EngineCalculations.CylinderAirmass.selection == undefined) {
        //         this.fuelTab.classList.add(`disabled`)
        //     } else {
        //         this.fuelTab.classList.remove(`disabled`)
        //     }
        // })
        this.sidebarOpen.addEventListener(`click`, () => {
            window.localStorage.setItem(`expanded`, `true`)
            var sidebarElement = this.firstChild
            var containerElement = this.lastChild
            sidebarElement.hidden = false
            var width = sidebarElement.offsetWidth
            var moveamount = 0.005 * width / 0.1
            var left = parseFloat(containerElement.style.left)
            if(isNaN(left))
                left = 0
            sidebarElement.style.left= `${left-width}px`
            var intervalId = setInterval(() => {
                if (left >= width) {
                    clearInterval(intervalId)
                } else {
                    left += moveamount
                    containerElement.style.marginRight = containerElement.style.left = `${left}px`
                    sidebarElement.style.left = `${left-width}px`
                    sidebarElement.style.opacity = left / width
                }
            }, 5)
            this.sidebarOpen.hidden = true
        })
        this.sidebarClose.addEventListener(`click`, () => {
            window.localStorage.setItem(`expanded`, `false`)
            var sidebarElement = this.firstChild
            var containerElement = this.lastChild
            var width = sidebarElement.offsetWidth
            var moveamount = 0.005 * width / 0.1
            var left = parseFloat(containerElement.style.left)
            if(isNaN(left))
                left = 0
            sidebarElement.style.left= `${left-width}px`
            var intervalId = setInterval(() => {
                if (left <= 0) {
                    clearInterval(intervalId)
                    sidebarElement.hidden = true
                } else {
                    left -= moveamount
                    containerElement.style.marginRight = containerElement.style.left = `${left}px`
                    sidebarElement.style.left = `${left-width}px`
                    sidebarElement.style.opacity = left / width
                }
            }, 5)
            this.sidebarOpen.hidden = false
        })
        this.title.class = `w3-padding-16`
        this.title.style.display = `inline-block`
        this.title.style.margin = `3px`
        this.activeTab = window.localStorage.getItem(`lastTab`) ?? `Inputs`
        this.dashboardTab.class = `w3-bar-item w3-button dashboard-tab`
        this.dashboardTab.addEventListener(`click`, () => {
            this.activeTab = `Dashboard`
        })
        this.pinOverlayTab.class = `w3-bar-item w3-button pinoverlay-tab`
        this.pinOverlayTab.addEventListener(`click`, () => {
            this.activeTab = `Pin Mapping`
        })
        this.inputsTabList = this.Inputs.inputListElement
        this.inputsTabList.addEventListener(`click`, () => {
            this.activeTab = `Inputs`
        })
        this.inputsTabExpend.className = `despand`
        this.inputsTabExpend.addEventListener(`click`, event => {
            this.inputsTabList.hidden = !this.inputsTabList.hidden
            if(this.inputsTabList.hidden) {
                window.localStorage.setItem(`inputExpanded`, `false`)
                this.inputsTabExpend.className = `expand`
            } else {
                window.localStorage.setItem(`inputExpanded`, `true`)
                this.inputsTabExpend.className = `despand`
            }
            event.preventDefault()
            event.stopPropagation()
            return false
        })
        this.inputsTab.append(this.inputsTabExpend)
        this.inputsTab.class = `w3-bar-item w3-button input-tab`
        this.inputsTab.addEventListener(`click`, () => {
            this.activeTab = `Inputs`
        })
        this.canTabList = this.CAN.canListElement
        this.canTabList.addEventListener(`click`, () => {
            this.activeTab = `CAN`
        })
        this.canTabExpend.className = `despand`
        this.canTabExpend.addEventListener(`click`, event => {
            this.canTabList.hidden = !this.canTabList.hidden
            if(this.canTabList.hidden) {
                window.localStorage.setItem(`canExpanded`, `false`)
                this.canTabExpend.className = `expand`
            } else {
                window.localStorage.setItem(`canExpanded`, `true`)
                this.canTabExpend.className = `despand`
            }
            event.preventDefault()
            event.stopPropagation()
            return false
        })
        this.canTab.append(this.canTabExpend)
        this.canTab.class = `w3-bar-item w3-button can-tab`
        this.canTab.addEventListener(`click`, () => {
            this.activeTab = `CAN`
        })
        this.engineTab.class = `w3-bar-item w3-button engine-tab`
        this.engineTab.addEventListener(`click`, () => {
            this.activeTab = `Engine`
        })
        this.fuelTab.class = `w3-bar-item w3-button fuel-tab`
        this.fuelTab.addEventListener(`click`, () => {
            if(!this.fuelTab.classList.contains(`disabled`))
                this.activeTab = `Fuel`
        })
        this.ignitionTab.class = `w3-bar-item w3-button ignition-tab`
        this.ignitionTab.addEventListener(`click`, () => {
            this.activeTab = `Ignition`
        })
        this.Setup(prop)
        let touched = false
        this.querySelector(`.sidebarSelection`).addEventListener(`touchstart`, () => {
            touched = true
        })
        this.addEventListener(`click`, () => {
            if(touched) {
                touched = false
                this.sidebarClose.dispatchEvent(new Event(`click`))
            }
        })
        window.setTimeout(() => {
            if((window.localStorage.getItem(`inputExpanded`) ?? 'true') === `false`) {
                this.inputsTabExpend.dispatchEvent(new Event(`click`))
            }
            if((window.localStorage.getItem(`canExpanded`) ?? 'true') === `false`) {
                this.canTabExpend.dispatchEvent(new Event(`click`))
            }
            if((window.localStorage.getItem(`expanded`) ?? `false`) === `true`) {
                this.sidebarOpen.dispatchEvent(new Event(`click`))
            }
        }, 50)
    }

    get activeTab() { return this.title.textContent }
    set activeTab(activeTab) {
        window.localStorage.setItem(`lastTab`, activeTab)
        this.title.textContent = activeTab
        this.Dashboard.hidden = true
        this.PinOverlay.hidden = true
        this.inputsWorkspace.hidden = true
        this.canWorkspace.hidden = true
        this.Engine.hidden = true
        this.Fuel.hidden = true
        this.Ignition.hidden = true
        this.dashboardTab.classList.remove(`active`)
        this.pinOverlayTab.classList.remove(`active`)
        this.inputsTab.classList.remove(`active`)
        this.canTab.classList.remove(`active`)
        this.engineTab.classList.remove(`active`)
        this.fuelTab.classList.remove(`active`)
        this.ignitionTab.classList.remove(`active`)
        switch(activeTab) {
            case `Dashboard`:
                this.Dashboard.hidden = false
                this.dashboardTab.classList.add(`active`)
                break
            case `Pin Mapping`:
                this.PinOverlay.hidden = false
                this.pinOverlayTab.classList.add(`active`)
                break
            case `Inputs`:
                this.inputsWorkspace.hidden = false
                this.inputsTab.classList.add(`active`)
                break
            case `CAN`:
                this.canWorkspace.hidden = false
                this.canTab.classList.add(`active`)
                break
            case `Engine`:
                this.Engine.hidden = false
                this.engineTab.classList.add(`active`)
                break
            case `Fuel`:
                this.Fuel.hidden = false
                this.fuelTab.classList.add(`active`)
                break
            case `Ignition`:
                this.Ignition.hidden = false
                this.ignitionTab.classList.add(`active`)
                break
        }
    }

    get saveValue() { return super.saveValue }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.RegisterVariables()
    }

    RegisterVariables() {
        VariableRegister.Clear()
        communication.liveUpdateEvents = []
        communication.variablesToPoll = []
        this.Inputs.RegisterVariables()
        this.CAN.RegisterVariables({ name: `CANParameters` })
        this.Engine.RegisterVariables()
        this.Fuel.RegisterVariables()
        this.Ignition.RegisterVariables()
        this.Dashboard.RegisterVariables()
        this.PinOverlay.update();
    }
}
customElements.define(`top-top`, Top, { extends: `span` })