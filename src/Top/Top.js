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
    <div class="application-header">
        <div data-element="sidebarOpen"></div>
    </div>
    <div data-element="pageTitle"></div>
    <hr style="margin: 0px 0px 5px 0px; display: none;">
    <div data-element="page"></div>
</div>`

    topTitle = document.createElement(`div`)
    pageTitle = document.createElement(`div`)
    sidebarClose = new UIButton({className: `sidebaropenclose w3-button w3-right`})
    sidebarOpen = new UIButton({className: `sidebaropenclose w3-button`})
    sidebarSelection = document.createElement(`div`)
    mainContent = document.createElement(`div`)
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

    #sidebarIsOpen = false
    #sidebarAnimations = []

    #setSidebarOpen(open) {
        const sidebar = this.firstChild
        const content = this.mainContent
        const wasHidden = sidebar.hidden
        const sidebarLeft = sidebar.getBoundingClientRect().left
        const contentLeft = content.getBoundingClientRect().left
        const opacity = wasHidden ? 0 : getComputedStyle(sidebar).opacity
        this.#sidebarAnimations.forEach(animation => animation.cancel())
        this.#sidebarIsOpen = open
        window.localStorage.setItem(`expanded`, `${open}`)

        sidebar.hidden = false
        const width = sidebar.offsetWidth
        sidebar.style.left = open ? `0px` : `${-width}px`
        sidebar.style.opacity = open ? `1` : `0`
        content.style.left = content.style.marginRight = open ? `${width}px` : `0px`

        // Set the final layout width once, then animate only visual transforms.
        const sidebarOffset = (wasHidden ? -width : sidebarLeft) - sidebar.getBoundingClientRect().left
        const contentOffset = contentLeft - content.getBoundingClientRect().left
        const options = { duration: 200, easing: `ease-out` }
        const sidebarAnimation = sidebar.animate([
            { transform: `translateX(${sidebarOffset}px)`, opacity },
            { transform: `translateX(0px)`, opacity: open ? 1 : 0 }
        ], options)
        const contentAnimation = content.animate([
            { transform: `translateX(${contentOffset}px)` },
            { transform: `translateX(0px)` }
        ], options)
        this.#sidebarAnimations = [sidebarAnimation, contentAnimation]
        sidebarAnimation.onfinish = () => {
            sidebar.hidden = !open
            this.#sidebarAnimations = []
        }
    }

    Setup(prop){
        this.className = `top`
        this.topTitle.className = `w3-bar-item`
        this.pageTitle.style.display = `none`
        this.pageTitle.style.margin = `3px`
        this.sidebarSelection.className = `w3-bar-block sidebarSelection`
        this.sidebarOpen.style.verticalAlign = `top`
        this.mainContent.className = `main-content`
        this.page.class = `w3-container w3-display-container`

        this.sidebarOpen.addEventListener(`click`, event => {
            if(event.efigenieSidebarHandled)
                return
            event.efigenieSidebarHandled = true
            this.#setSidebarOpen(!this.#sidebarIsOpen)
        })
        this.sidebarClose.addEventListener(`click`, event => {
            if(event.efigenieSidebarHandled)
                return
            event.efigenieSidebarHandled = true
            this.#setSidebarOpen(false)
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
            if((window.localStorage.getItem(`expanded`) ?? `false`) === `true` &&
                this.firstChild.style.display === `none`) {
                this.sidebarOpen.dispatchEvent(new Event(`click`))
            }
        }, 50)
        super.Setup(prop)
        const contentParent = this.pageTitle.parentElement
        const divider = this.pageTitle.nextElementSibling
        contentParent.insertBefore(this.mainContent, this.pageTitle)
        this.mainContent.replaceChildren()
        this.mainContent.append(this.pageTitle, divider, this.page)
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

    get saveValue() {
        const sv = super.saveValue
        const enums = window.EnumRegister?.saveValue
        if(enums != null) sv.enums = enums
        return sv
    }
    set saveValue(saveValue) {
        // Restore enum definitions before components re-register variables so
        // that enum-typed CAN parse entries resolve correctly on load.
        if(saveValue?.enums !== undefined)
            window.EnumRegister.saveValue = saveValue.enums
        else
            window.EnumRegister.saveValue = {}
        super.saveValue = saveValue
        this.RegisterVariables()
    }

    RegisterVariables() {
    }
}
customElements.define(`top-top`, Top, { extends: `span` })
