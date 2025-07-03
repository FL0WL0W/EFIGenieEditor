import UITemplate from "../JavascriptUI/UITemplate"
import UIButton from "../JavascriptUI/UIButton"

export default class Top extends UITemplate {
    static template = 
`<div class="w3-sidebar" style="display: none;">
    <div class="w3-bar">
        <div data-element="topTitle"></div>
        <div data-element="sidebarClose"></div>
    </div>
    <div data-element="sidebarSelection">
    </div>
</div>
<div>
    <div style="background-color: #121619;">
        <div data-element="sidebarOpen"></div>
        <div style="display: inline-block;">
            <span>
                <div data-element="btnOpen"></div>
            </span>
        </div>
    </div>
    <div data-element="pageTitle"></div>
    <hr style="margin: 0px 0px 5px 0px;">
    <div data-element="page"></div>
</div>`

    btnOpen = new UIButton({ label: `Open` });
    topTitle = document.createElement(`div`)
    pageTitle = document.createElement(`div`)
    sidebarClose = new UIButton({className: `sidebaropenclose w3-button w3-right`})
    sidebarOpen = new UIButton({className: `sidebaropenclose w3-button`})
    sidebarSelection = document.createElement(`div`)
    page = document.createElement(`div`)

    addTab(content, label)
    {
        const tab = document.createElement(`div`)
        this.sidebarSelection.append(tab)
        tab.class = `w3-bar-item w3-button tab`
        tab.setAttribute('data-label', label);
        tab.addEventListener(`click`, () => {
            this.activeTab = label
        })
        if(content.tabListElement) {
            content.tabListElement.setAttribute('data-label', label);
            const expanded = (window.localStorage.getItem(`${label}Expanded`) ?? 'true') === `false`
            const tabExpand = document.createElement(`span`)
            tab.append(tabExpand)
            if(expanded) {
                tabExpand.className = `despand`
                content.tabListElement.hidden = false
            } else {
                tabExpand.className = `expand`
                content.tabListElement.hidden = true
            }
            tabExpand.addEventListener(`click`, event => {
                content.tabListElement.hidden = !content.tabListElement.hidden
                if(content.tabListElement.hidden) {
                    window.localStorage.setItem(`${label}Expanded`, `true`)
                    tabExpand.className = `expand`
                } else {
                    window.localStorage.setItem(`${label}Expanded`, `false`)
                    tabExpand.className = `despand`
                }
                event.preventDefault()
                event.stopPropagation()
                return false
            })
            content.tabListElement.addEventListener(`click`, () => {
                this.activeTab = label
            })
            this.sidebarSelection.append(content.tabListElement)
        }
        const workspace = document.createElement(`div`)
        workspace.label = label
        workspace.append(content)
        this.page.append(workspace)
    }

    hideTab(label) {
        this.sidebarSelection.querySelectorAll(`div[data-label="${label}"]`).forEach(x => { x.hidden = true })
    }

    unhideTab(label) {
        this.sidebarSelection.querySelectorAll(`div[data-label="${label}"]`).forEach(x => { x.hidden = false })
    }

    constructor(prop) { 
        super() 
        this.Setup(prop) 
    }

    Setup(prop){
        this.className = `top`
        this.topTitle.className = `w3-bar-item`
        this.pageTitle.style.display = `block`
        this.pageTitle.style.margin = `3px`
        this.sidebarSelection.className = `w3-bar-block sidebarSelection`
        this.sidebarOpen.style.verticalAlign = `top`
        this.btnOpen.classList.remove(`ui`, `button`)
        this.btnOpen.classList.add(`w3-button`)
        this.page.class = `w3-container w3-display-container`

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
        let touched = false
        this.sidebarSelection.addEventListener(`touchstart`, () => {
            touched = true
        })
        this.addEventListener(`click`, () => {
            if(touched) {
                touched = false
                this.sidebarClose.dispatchEvent(new Event(`click`))
            }
        })
        this.activeTab = window.localStorage.getItem(`lastTab`) ?? `Inputs`
        window.setTimeout(() => {
            if((window.localStorage.getItem(`expanded`) ?? `false`) === `true`) {
                this.sidebarOpen.dispatchEvent(new Event(`click`))
            }
        }, 50)
        super.Setup(prop)
        this.lastChild.style.position = `relative`
    }

    get activeTab() { return this.pageTitle.textContent }
    set activeTab(activeTab) {
        window.localStorage.setItem(`lastTab`, activeTab)
        this.pageTitle.textContent = activeTab
        this.topTitle.textContent = activeTab
        ; [...this.page.children].forEach(element => {
            element.hidden = element.label !== activeTab
        });
    }

    get saveValue() { return super.saveValue }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.RegisterVariables()
    }

    RegisterVariables() {
    }
}
customElements.define(`top-top`, Top, { extends: `span` })