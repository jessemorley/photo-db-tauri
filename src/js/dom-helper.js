/**
 * DOM Helper - Centralized DOM element access and manipulation utility
 */
class DOMHelper {
    static cache = new Map();
    
    static get(id) {
        if (!this.cache.has(id)) {
            const element = document.getElementById(id);
            this.cache.set(id, element);
        }
        return this.cache.get(id);
    }
    
    static clearCache() {
        this.cache.clear();
    }
    
    static toggleClass(elementId, className, condition = null) {
        const element = this.get(elementId);
        if (!element) return;
        
        if (condition === null) {
            element.classList.toggle(className);
        } else {
            element.classList.toggle(className, condition);
        }
    }
    
    static addClass(elementId, className) {
        const element = this.get(elementId);
        if (element) element.classList.add(className);
    }
    
    static removeClass(elementId, className) {
        const element = this.get(elementId);
        if (element) element.classList.remove(className);
    }
    
    static showHide(elementId, show) {
        this.toggleClass(elementId, 'hidden', !show);
    }
    
    static activate(elementId, active = true) {
        this.toggleClass(elementId, 'active', active);
    }
    
    static setVisible(elementId, visible = true) {
        this.toggleClass(elementId, 'visible', visible);
    }
    
    static setText(elementId, text) {
        const element = this.get(elementId);
        if (element) element.textContent = text;
    }
    
    static setValue(elementId, value) {
        const element = this.get(elementId);
        if (element) element.value = value;
    }
    
    static setChecked(elementId, checked) {
        const element = this.get(elementId);
        if (element) element.checked = checked;
    }
    
    static setSrc(elementId, src) {
        const element = this.get(elementId);
        if (element) element.src = src;
    }
    
    static addEventListener(elementId, event, handler, options = {}) {
        const element = this.get(elementId);
        if (element) element.addEventListener(event, handler, options);
    }
    
    static removeEventListener(elementId, event, handler) {
        const element = this.get(elementId);
        if (element) element.removeEventListener(event, handler);
    }
    
    static hasClass(elementId, className) {
        const element = this.get(elementId);
        return element ? element.classList.contains(className) : false;
    }
}