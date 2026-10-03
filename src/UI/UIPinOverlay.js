import UISelection from "../JavascriptUI/UISelection"
export default class UIPinOverlay extends HTMLDivElement {
    pinSelectElementChangeHandler = () => {
        this.update();
    }
    get pinSelectElements() {
        function getNameFromPinSelectChildren(element){
            if(element.classList.contains(`pinselectname`)){
                const name = element.value
                if(!name) return element.textContent
                return name
            }
    
            const elements = element.children
            for(var i = 0; i < elements?.length; i++) {
                const name = getNameFromPinSelectChildren(elements[i])
                if(name) return name
            }
        }
        function getNameFromPinSelectElement(element, depth = 10){
            return (!element || depth > 20)? undefined : getNameFromPinSelectChildren(element) ?? getNameFromPinSelectElement(element.parentElement, depth++)
        }

        let elements = [...document.querySelectorAll(`.pinselect`)]
        elements.forEach((element) => {
            element.name = getNameFromPinSelectElement(element)
            element.updateOptions?.(this.pinOut);
            element.addEventListener(`change`, this.pinSelectElementChangeHandler)
        })
        return elements
    }

    #pinOut
    get pinOut() { return this.#pinOut }
    set pinOut(pinOut) {
        if(!pinOut) return
        this.#pinOut = pinOut
        const pinScale = pinOut.OverlayElementHeight / 20.8
        const xMin = Math.min(...pinOut.Pins.map(pin => pin.overlayX - (pin.align == `right`? 150 * pinScale : 0)), 0)
        const xMax = Math.max(...pinOut.Pins.map(pin => pin.overlayX + (pin.align == `left`? 150 * pinScale : 0)), pinOut.OverlayWidth)
        const xWhiteSpace = -xMin + xMax - pinOut.OverlayWidth
        const scale = 910 / (pinOut.OverlayWidth + xWhiteSpace)
        this.overlayImage.style.width = `${pinOut.OverlayWidth}px`
        this.overlayImage.style.left = `${-xMin + pinScale}px`
        this.style.width = `910px`
        this.style.transformOrigin = `top left`
        this.style.transform = `scale(${scale})`
        this.overlayImage.src = pinOut.Overlay
        this.pinElements.style.transformOrigin = `top left`
        this.pinElements.style.scale = `${pinScale}`
        while(pinOut.Pins.length < this.pinElements.children.length) this.pinElements.removeChild(this.pinElements.lastChild)
        for(let i = 0; i < pinOut.Pins.length; i++) {
            let pinElement = this.pinElements.children[i]
            if(!pinElement) {
                pinElement = this.pinElements.appendChild(new UISelection())
                pinElement.firstChild.style.minWidth = `100px`
                pinElement.style.width = 150 + `px`
                pinElement.style.position = `absolute`
                Object.defineProperty(pinElement, 'pinSelectElements', {
                    set: function(pinSelectElements) { 
                        this._pinSelectElements = pinSelectElements
                        let options = []
                        let selectedOption
                        for(let s=0; s<pinSelectElements.length; s++) {
                            let option = {
                                name: pinSelectElements[s].name,
                                value: s,
                                disabled: this.supportedModes.split(` `).indexOf(pinSelectElements[s].pinType) === -1
                            }
                            if(pinSelectElements[s].value == this.pin) {
                                if(selectedOption) {
                                    option.Class = `pinconflict`
                                    if(typeof selectedOption !== `string`)
                                    selectedOption.Class = `pinconflict`
                                    selectedOption = `conflict`
                                } else {
                                    selectedOption = option
                                }
                            }
                            options.push(option)
                        }
                        this.options = options
                        if(!selectedOption) {
                            this.value = undefined
                        } else if(selectedOption === `conflict`) {
                            this.classList.add(`pinconflict`)
                            this.value = undefined
                        }
                        else {
                            this.classList.remove(`pinconflict`)
                            this.value = selectedOption.value
                        }
                    }
                })
                pinElement.addEventListener(`change`, () => {
                    if(pinElement.value != undefined) pinElement._pinSelectElements[pinElement.value].value = pinElement.pin
                })
            }
            pinElement.pin = pinOut.Pins[i].value
            pinElement.supportedModes = pinOut.Pins[i].supportedModes
            pinElement.style.top = (pinOut.Pins[i].overlayY - pinOut.OverlayElementHeight / 2)  / pinScale + `px`
            if(pinOut.Pins[i].align === `left`) {
                pinElement.style.left = (pinOut.Pins[i].overlayX - xMin) / pinScale + `px`
            } else {
                pinElement.style.left = (pinOut.Pins[i].overlayX - xMin) / pinScale -150 + `px`
            }
        }
        this.update()
    }
    update() {
        const pinSelectElements = this.pinSelectElements
        const childElements = [...this.pinElements.children]
        childElements.forEach(element => element.pinSelectElements = pinSelectElements)
    }
    pinElements = document.createElement(`div`)
    overlayImage = document.createElement(`img`)
    constructor() {
        super()
        this.class = `pinoverlay`
        this.append(this.overlayImage)
        this.append(this.pinElements)
    }
}
customElements.define('ui-pinoverlay', UIPinOverlay, { extends: `div` })