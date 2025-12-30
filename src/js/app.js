class PhotographerBrowser {
    constructor() {
        this.currentPath = null;
        this.currentPhotographer = null;
        this.photographers = [];
        this.currentImages = [];
        this.filteredPhotographers = [];
        this.currentImageIndex = 0;
        this.eyedropperActive = false;
        this.persistentEyedropper = false;
        this.histogramActive = false;
        this.persistentHistogram = false;
        this.histogramData = null;
        this.currentLuminosity = null;
        this.currentGalleryStyle = 'default'; // Initialize with default style
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isAnimating = false; // Prevent multiple clicks during transitions
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.initializeTheme();
        await this.initializeHexDisplay();
        await this.initializeEyedropperState();
        await this.initializeHistogramState();
        await this.initializeGalleryStyle();
        await this.checkStoredFolder();
    }

    async initializeTheme() {
        const savedTheme = await window.electronAPI.getTheme();
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
                // Re-check the current theme setting
                const currentTheme = await window.electronAPI.getTheme();
                if (currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }

    async toggleHistogram() {
        if (this.histogramActive) {
            this.deactivateHistogram();
            this.persistentHistogram = false;
            await window.electronAPI.setHistogramActive(false);
        } else {
            this.activateHistogram();
            this.persistentHistogram = true;
            await window.electronAPI.setHistogramActive(true);
        }
    }

    activateHistogram() {
        this.histogramActive = true;
        DOMHelper.activate('histogramButton');
        DOMHelper.activate('histogramDisplay');
        
        // Generate histogram for current image
        if (DOMHelper.get('viewerImage').src) {
            this.generateHistogram();
        }
    }

    deactivateHistogram() {
        this.histogramActive = false;
        DOMHelper.activate('histogramButton', false);
        DOMHelper.activate('histogramDisplay', false);
        this.histogramData = null;
    }

    generateHistogram() {
        const canvas = DOMHelper.get('viewerCanvas');
        const ctx = canvas.getContext('2d');
        
        if (!canvas.width || !canvas.height) return;
        
        // Sample every 4th pixel for performance (adjust as needed)
        const sampleRate = 4;
        const histogram = new Array(256).fill(0);
        let totalPixels = 0;
        
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4 * sampleRate) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate luminosity (ITU-R BT.709)
                const luminosity = Constants.calculateLuminosity(r, g, b);
                histogram[luminosity]++;
                totalPixels++;
            }
            
            this.histogramData = histogram;
            this.drawHistogram(histogram, totalPixels, this.currentLuminosity);
        } catch (error) {
            console.error('Error generating histogram:', error);
        }
    }

    drawHistogram(histogram, totalPixels, luminosity = null) {
        const canvas = DOMHelper.get('histogramCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Find max value for normalization
        const maxValue = Math.max(...histogram);
        if (maxValue === 0) return;
        
        // Draw histogram bars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < 256; i++) {
            const barHeight = (histogram[i] / maxValue) * height;
            const x = i;
            const y = height - barHeight;
            
            ctx.fillRect(x, y, 1, barHeight);
        }
        
        // Draw grid lines for reference
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        // Vertical lines (quarters)
        for (let i = 1; i < 4; i++) {
            const x = (width / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines (quarters)
        for (let i = 1; i < 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw vertical line for current luminosity value if available
        if (luminosity !== null && luminosity >= 0 && luminosity <= 255) {
            ctx.strokeStyle = 'rgba(142, 0, 0, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(luminosity, 0);
            ctx.lineTo(luminosity, height);
            ctx.stroke();
        }
    }

    applyTheme(theme) {
        const body = document.body;
        
        if (theme === 'dark') {
            body.classList.add('dark-mode');
        } else if (theme === 'light') {
            body.classList.remove('dark-mode');
        } else if (theme === 'auto') {
            // Use system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }
        }
    }

    async checkStoredFolder() {
        const storedFolder = await window.electronAPI.getStoredFolder();
        if (storedFolder) {
            this.currentPath = storedFolder;
            this.showAppInterface();
            this.loadPhotographers();
        } else {
            this.showInitialSetup();
        }
    }

    showInitialSetup() {
        DOMHelper.showHide('initialSetup', true);
        DOMHelper.showHide('appInterface', false);
    }

    showAppInterface() {
        DOMHelper.showHide('initialSetup', false);
        DOMHelper.showHide('appInterface', true);
    }

    bindEvents() {
        // Initial setup
        DOMHelper.addEventListener('initialSelectButton', 'click', () => {
            this.selectFolder(true);
        });

        // Main interface
        DOMHelper.addEventListener('backButton', 'click', () => {
            // Close image viewer if active, otherwise go back normally
            if (DOMHelper.hasClass('imageViewer', 'active')) {
                this.closeImageViewer();
            } else {
                this.goBack();
            }
        });

        DOMHelper.addEventListener('gearButton', 'click', () => {
            this.openPreferences();
        });

        DOMHelper.addEventListener('searchBar', 'input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Preferences modal
        DOMHelper.addEventListener('preferencesClose', 'click', () => {
            this.closePreferences();
        });

        DOMHelper.addEventListener('changeFolderButton', 'click', () => {
            this.selectFolder(false);
        });

        DOMHelper.addEventListener('resetFolderButton', 'click', () => {
            this.resetFolder();
        });

        DOMHelper.addEventListener('themeSelector', 'change', async (e) => {
            const selectedTheme = e.target.value;
            this.currentTheme = selectedTheme;
            await window.electronAPI.setTheme(selectedTheme);
            this.applyTheme(selectedTheme);
        });

        DOMHelper.addEventListener('hexToggle', 'change', async (e) => {
            const showHex = e.target.checked;
            await window.electronAPI.setShowHex(showHex);
            this.updateHexDisplay(showHex);
        });

        DOMHelper.addEventListener('galleryStyleSelector', 'change', async (e) => {
            const selectedGalleryStyle = e.target.value;
            await window.electronAPI.setGalleryStyle(selectedGalleryStyle);
            this.applyGalleryStyle(selectedGalleryStyle);
        });

        DOMHelper.addEventListener('confirmButton', 'click', () => {
            this.closePreferences();
        });

        DOMHelper.addEventListener('preferencesModal', 'click', (e) => {
            if (e.target === DOMHelper.get('preferencesModal')) {
                this.closePreferences();
            }
        });

        // Image viewer events - arrow buttons removed, keeping keyboard navigation

        DOMHelper.addEventListener('eyedropperButton', 'click', () => {
            this.toggleEyedropper();
        });

        DOMHelper.addEventListener('histogramButton', 'click', () => {
            this.toggleHistogram();
        });

        DOMHelper.addEventListener('revealFolderButton', 'click', () => {
            this.revealInFinder();
        });

        // Histogram dragging events
        this.setupHistogramDragging();

        DOMHelper.addEventListener('imageViewer', 'click', (e) => {
            const viewerImage = DOMHelper.get('viewerImage');
            const histogramDisplay = DOMHelper.get('histogramDisplay');
            const rgbDisplay = DOMHelper.get('rgbDisplay');
            
            // Close if clicking outside the image, but not on histogram or RGB display
            if (e.target !== viewerImage && 
                !histogramDisplay.contains(e.target) && 
                !rgbDisplay.contains(e.target)) {
                this.closeImageViewer();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (DOMHelper.hasClass('imageViewer', 'active')) {
                if (e.key === 'Escape') {
                    this.closeImageViewer();
                } else if (e.key === 'ArrowLeft') {
                    this.showPreviousImage();
                } else if (e.key === 'ArrowRight') {
                    this.showNextImage();
                } else if (e.key === 'h' || e.key === 'H') {
                    this.toggleHistogram();
                } else if (e.key === 'i' || e.key === 'I') {
                    this.toggleEyedropper();
                }
            } else if (DOMHelper.hasClass('preferencesModal', 'active')) {
                if (e.key === 'Escape') {
                    this.closePreferences();
                }
            }
        });
    }

    async selectFolder(isInitial = false) {
        const folderPath = await window.electronAPI.selectDirectory();
        if (folderPath) {
            this.currentPath = folderPath;
            this.currentPhotographer = null;
            
            if (isInitial) {
                this.showAppInterface();
            } else {
                this.closePreferences();
            }
            
            this.loadPhotographers();
        }
    }

    async resetFolder() {
        await window.electronAPI.clearStoredFolder();
        this.currentPath = null;
        this.currentPhotographer = null;
        this.closePreferences();
        this.showInitialSetup();
    }

    openPreferences() {
        DOMHelper.setText('currentFolderPath', this.currentPath || 'No folder selected');
        
        // Set current theme in selector
        window.electronAPI.getTheme().then(theme => {
            DOMHelper.setValue('themeSelector', theme);
        });
        
        // Set current gallery style in selector
        window.electronAPI.getGalleryStyle().then(galleryStyle => {
            DOMHelper.setValue('galleryStyleSelector', galleryStyle);
        });
        
        // Set current hex toggle state
        window.electronAPI.getShowHex().then(showHex => {
            DOMHelper.setChecked('hexToggle', showHex);
        });
        
        DOMHelper.activate('preferencesModal');
    }

    closePreferences() {
        DOMHelper.activate('preferencesModal', false);
    }

    updateHexDisplay(showHex) {
        DOMHelper.setVisible('hexValue', showHex);
    }

    async initializeHexDisplay() {
        const showHex = await window.electronAPI.getShowHex();
        this.updateHexDisplay(showHex);
    }

    async initializeEyedropperState() {
        const eyedropperActive = await window.electronAPI.getEyedropperActive();
        this.persistentEyedropper = eyedropperActive;
    }

    async loadPhotographers() {
        this.showLoading(true);
        this.hideBackButton();
        
        DOMHelper.setText('currentPath', this.currentPath);
        DOMHelper.setValue('searchBar', '');
        
        // Update search context to photographer search
        this.updateSearchContext(false);
        
        // Hide reveal folder button for photographer list view
        DOMHelper.showHide('revealFolderButton', false);

        try {
            this.photographers = await window.electronAPI.getPhotographers(this.currentPath);
            this.filteredPhotographers = [...this.photographers];
            this.renderPhotographers();
        } catch (error) {
            console.error('Error loading photographers:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadPhotographerImages(photographer) {
        this.showLoading(true);
        this.currentPhotographer = photographer;
        this.showBackButton();
        
        DOMHelper.setText('currentPath', `${this.currentPath} > ${photographer.name}`);
        DOMHelper.setValue('searchBar', '');
        
        // Update search context to photographer view
        this.updateSearchContext(true, photographer.name);
        
        // Show reveal folder button for photographer view
        DOMHelper.showHide('revealFolderButton', true);

        try {
            this.currentImages = await window.electronAPI.getImages(photographer.path);
            this.renderImages();
        } catch (error) {
            console.error('Error loading images:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadPhotographerImagesAnimated(photographer, clickedCard) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        try {
            // Ensure clean state before starting animation
            this.ensureCleanAnimationState();

            // Phase 1: Fade out all cards quickly (150ms)
            await this.fadeOutAllCards();

            // Phase 2: Reset scroll position
            this.resetScrollPosition();

            // Phase 3: Load images and update UI state
            this.currentPhotographer = photographer;
            this.showBackButton();
            DOMHelper.setText('currentPath', `${this.currentPath} > ${photographer.name}`);
            DOMHelper.setValue('searchBar', '');
            this.updateSearchContext(true, photographer.name);
            DOMHelper.showHide('revealFolderButton', true);

            // Load images data
            this.currentImages = await window.electronAPI.getImages(photographer.path);

            // Phase 4: Render and fade in new images
            await this.renderImagesAnimated();

        } catch (error) {
            console.error('Error loading images with animation:', error);
            // Fallback to regular loading with cleanup
            this.forceResetAnimationState();
            this.loadPhotographerImages(photographer);
        } finally {
            // Always ensure animation flag is reset, even if cleanup fails
            this.isAnimating = false;
        }
    }

    renderPhotographers() {
        const grid = DOMHelper.get('contentGrid');
        grid.innerHTML = '';

        if (this.filteredPhotographers.length === 0) {
            this.showNoResults(true);
            return;
        }

        this.showNoResults(false);

        this.filteredPhotographers.forEach(photographer => {
            const card = this.createPhotographerCard(photographer);
            grid.appendChild(card);
        });
    }

    renderImages() {
        const grid = DOMHelper.get('contentGrid');
        grid.innerHTML = '';

        if (this.currentImages.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No images found in this folder.</div>';
            return;
        }

        this.currentImages.forEach((image, index) => {
            const card = this.createImageCard(image, index);
            grid.appendChild(card);
        });
    }

    createPhotographerCard(photographer) {
        const card = document.createElement('div');
        card.className = 'photographer-card';
        
        const imageDiv = document.createElement('div');
        imageDiv.className = 'card-image';
        
        if (photographer.previewImage) {
            const img = document.createElement('img');
            img.src = window.convertFileSrc(photographer.previewImage);
            img.onerror = () => {
                imageDiv.innerHTML = 'No preview available';
            };
            imageDiv.appendChild(img);
        } else {
            imageDiv.textContent = 'No preview available';
        }
        
        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = photographer.name;
        
        // Check if we're using default style (overlay) and place title accordingly
        if (this.currentGalleryStyle === 'default') {
            // For default style (overlay), place title inside image container
            imageDiv.appendChild(title);
            card.appendChild(imageDiv);
        } else {
            // For magazine style, place title below image
            card.appendChild(imageDiv);
            card.appendChild(title);
        }
        
        card.addEventListener('click', (e) => {
            if (this.isAnimating) {
                console.log('Animation in progress, ignoring click');
                return; // Prevent multiple clicks during animation
            }
            this.loadPhotographerImagesAnimated(photographer, card);
        });
        
        return card;
    }

    createImageCard(image, index) {
        const card = document.createElement('div');
        card.className = 'image-card';
        
        const imageDiv = document.createElement('div');
        imageDiv.className = 'card-image';
        
        const img = document.createElement('img');
        img.src = window.convertFileSrc(image.path);
        img.onerror = () => {
            imageDiv.innerHTML = 'Unable to load image';
        };
        imageDiv.appendChild(img);
        
        card.appendChild(imageDiv);
        
        card.addEventListener('click', () => {
            this.openImageViewer(index);
        });
        
        return card;
    }

    async initializeHistogramState() {
        const histogramActive = await window.electronAPI.getHistogramActive();
        this.persistentHistogram = histogramActive;
    }

    async initializeGalleryStyle() {
        const savedGalleryStyle = await window.electronAPI.getGalleryStyle();
        this.currentGalleryStyle = savedGalleryStyle;
        this.applyGalleryStyle(savedGalleryStyle);
    }

    applyGalleryStyle(galleryStyle) {
        const body = document.body;
        
        // Remove existing gallery style classes
        body.classList.remove('gallery-default', 'gallery-magazine');
        
        // Apply the selected gallery style
        if (galleryStyle === 'default') {
            body.classList.add('gallery-default');
        } else if (galleryStyle === 'magazine') {
            body.classList.add('gallery-magazine');
        }
        
        // Store the current gallery style
        this.currentGalleryStyle = galleryStyle;
        
        // Re-render photographers if we're currently viewing them
        if (!this.currentPhotographer && this.photographers && this.photographers.length > 0) {
            this.renderPhotographers();
        }
    }

    openImageViewer(index) {
        this.currentImageIndex = index;
        const image = this.currentImages[index];
        const viewerImage = DOMHelper.get('viewerImage');
        viewerImage.src = window.convertFileSrc(image.path);
        
        // Show reveal folder, eyedropper, and histogram buttons in menu
        DOMHelper.showHide('revealFolderButton', true);
        DOMHelper.showHide('eyedropperButton', true);
        DOMHelper.showHide('histogramButton', true);
        
        // Setup canvas when image loads
        viewerImage.onload = () => {
            this.setupCanvas();
        };
        
        DOMHelper.activate('imageViewer');
        
        // Restore persistent states
        if (this.persistentEyedropper) {
            this.activateEyedropper();
        }
        if (this.persistentHistogram) {
            this.activateHistogram();
        }
    }

    closeImageViewer() {
        DOMHelper.activate('imageViewer', false);
        
        // Hide eyedropper and histogram buttons in menu (keep reveal folder visible)
        DOMHelper.showHide('eyedropperButton', false);
        DOMHelper.showHide('histogramButton', false);
        
        this.deactivateEyedropper();
        this.deactivateHistogram();
    }

    async revealInFinder() {
        // Check if we're viewing a single image
        const imageViewerActive = DOMHelper.hasClass('imageViewer', 'active');
        
        if (imageViewerActive && this.currentImages && this.currentImages[this.currentImageIndex]) {
            // Reveal the specific image file
            const currentImage = this.currentImages[this.currentImageIndex];
            await window.electronAPI.revealInFinder(currentImage.path);
        } else if (this.currentPhotographer) {
            // Reveal the photographer folder
            await window.electronAPI.revealInFinder(this.currentPhotographer.path);
        }
    }

    updateSearchContext(isPhotographerView = false, photographerName = '') {
        const searchIcon = document.querySelector('.search-icon');
        const searchBar = document.getElementById('searchBar');
        
        if (isPhotographerView && photographerName) {
            // Switch to user icon and photographer name as display
            searchIcon.innerHTML = '<path d="m7.5.5c1.65685425 0 3 1.34314575 3 3v2c0 1.65685425-1.34314575 3-3 3s-3-1.34314575-3-3v-2c0-1.65685425 1.34314575-3 3-3zm7 14v-.7281753c0-3.1864098-3.6862915-5.2718247-7-5.2718247s-7 2.0854149-7 5.2718247v.7281753c0 .5522847.44771525 1 1 1h12c.5522847 0 1-.4477153 1-1z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 2)"/>';
            searchBar.value = photographerName;
            searchBar.placeholder = '';
            searchBar.readOnly = true;
            searchBar.style.cursor = 'default';
        } else {
            // Switch back to search icon and editable search
            searchIcon.innerHTML = '<g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5"/><path d="m17.571 17.5-5.571-5.5"/></g>';
            searchBar.value = '';
            searchBar.placeholder = 'Search';
            searchBar.readOnly = false;
            searchBar.style.cursor = 'text';
        }
    }

    setupCanvas() {
        const viewerImage = DOMHelper.get('viewerImage');
        const canvas = DOMHelper.get('viewerCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match displayed image
        const rect = viewerImage.getBoundingClientRect();
        canvas.width = viewerImage.naturalWidth;
        canvas.height = viewerImage.naturalHeight;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        canvas.style.position = 'absolute';
        canvas.style.left = (rect.left - viewerImage.closest('.viewer-main').getBoundingClientRect().left) + 'px';
        canvas.style.top = (rect.top - viewerImage.closest('.viewer-main').getBoundingClientRect().top) + 'px';
        
        // Draw image to canvas
        ctx.drawImage(viewerImage, 0, 0);
        
        // Generate histogram if active
        if (this.histogramActive) {
            this.generateHistogram();
        }
    }

    async toggleEyedropper() {
        if (this.eyedropperActive) {
            this.deactivateEyedropper();
            this.persistentEyedropper = false;
            await window.electronAPI.setEyedropperActive(false);
        } else {
            this.activateEyedropper();
            this.persistentEyedropper = true;
            await window.electronAPI.setEyedropperActive(true);
        }
    }

    activateEyedropper() {
        this.eyedropperActive = true;
        DOMHelper.activate('eyedropperButton');
        DOMHelper.activate('rgbDisplay');
        
        const viewerImage = DOMHelper.get('viewerImage');
        viewerImage.style.cursor = 'crosshair';
        
        // Add mouse move listener
        this.mouseMoveHandler = (e) => this.handleMouseMove(e);
        viewerImage.addEventListener('mousemove', this.mouseMoveHandler);
    }

    deactivateEyedropper() {
        this.eyedropperActive = false;
        DOMHelper.activate('eyedropperButton', false);
        DOMHelper.activate('rgbDisplay', false);
        
        const viewerImage = DOMHelper.get('viewerImage');
        viewerImage.style.cursor = 'default';
        
        // Remove mouse move listener
        if (this.mouseMoveHandler) {
            viewerImage.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        
        // Clear luminosity tracking and redraw histogram without line
        this.currentLuminosity = null;
        if (this.histogramActive && this.histogramData) {
            this.drawHistogram(this.histogramData, null, null);
        }
    }

    handleMouseMove(e) {
        const viewerImage = DOMHelper.get('viewerImage');
        const canvas = DOMHelper.get('viewerCanvas');
        const ctx = canvas.getContext('2d');
        
        // Get mouse position relative to image
        const rect = viewerImage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to canvas coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = Math.floor(x * scaleX);
        const canvasY = Math.floor(y * scaleY);
        
        // Get pixel data
        if (canvasX >= 0 && canvasX < canvas.width && canvasY >= 0 && canvasY < canvas.height) {
            const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            const data = imageData.data;
            const r = data[0];
            const g = data[1];
            const b = data[2];
            
            // Calculate luminosity (ITU-R BT.709)
            const luminosity = Constants.calculateLuminosity(r, g, b);
            
            // Store current luminosity for histogram line
            this.currentLuminosity = luminosity;
            
            // Convert to hex
            const hex = Constants.rgbToHex(r, g, b);
            
            // Update RGB display - colors are now fixed via CSS classes
            DOMHelper.setText('rValue', r);
            DOMHelper.setText('gValue', g);
            DOMHelper.setText('bValue', b);
            DOMHelper.setText('lValue', luminosity);
            DOMHelper.setText('hexValue', hex);
            
            // Redraw histogram with luminosity line if histogram is active
            if (this.histogramActive && this.histogramData) {
                this.drawHistogram(this.histogramData, null, luminosity);
            }
        }
    }

    showPreviousImage() {
        // Loop to last image if at first image
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
        } else {
            this.currentImageIndex = this.currentImages.length - 1;
        }
        
        const image = this.currentImages[this.currentImageIndex];
        const viewerImage = DOMHelper.get('viewerImage');
        viewerImage.src = window.convertFileSrc(image.path);
        
        // Refresh canvas when image loads
        viewerImage.onload = () => {
            this.setupCanvas();
        };
    }

    showNextImage() {
        // Loop to first image if at last image
        if (this.currentImageIndex < this.currentImages.length - 1) {
            this.currentImageIndex++;
        } else {
            this.currentImageIndex = 0;
        }
        
        const image = this.currentImages[this.currentImageIndex];
        const viewerImage = DOMHelper.get('viewerImage');
        viewerImage.src = window.convertFileSrc(image.path);
        
        // Refresh canvas when image loads
        viewerImage.onload = () => {
            this.setupCanvas();
        };
    }

    handleSearch(query) {
        if (this.currentPhotographer) {
            // Searching images - you can implement this if needed
            return;
        }

        // Searching photographers
        if (!query.trim()) {
            this.filteredPhotographers = [...this.photographers];
        } else {
            this.filteredPhotographers = this.photographers.filter(photographer =>
                photographer.name.toLowerCase().includes(query.toLowerCase())
            );
        }
        this.renderPhotographers();
    }

    goBack() {
        if (this.currentPhotographer) {
            this.currentPhotographer = null;
            // Update search context back to photographer search
            this.updateSearchContext(false);
            // Hide reveal folder button
            DOMHelper.showHide('revealFolderButton', false);
            
            // Force complete reset of animation state
            this.forceResetAnimationState();
            
            this.loadPhotographersAnimated();
        }
    }

    async loadPhotographersAnimated() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        try {
            // Phase 1: Fade out all image cards quickly
            await this.fadeOutImageCards();
            
            // Phase 2: Load and render photographers with staggered fade-in
            await this.renderPhotographersAnimated();
            
        } catch (error) {
            console.error('Error loading photographers with animation:', error);
            // Fallback to regular loading
            this.loadPhotographers();
        } finally {
            this.isAnimating = false;
        }
    }

    async fadeOutImageCards() {
        return new Promise((resolve) => {
            const allCards = document.querySelectorAll('.image-card');
            
            allCards.forEach(card => {
                card.classList.add('card-fade-out');
            });
            
            // Wait for faster fade animation (150ms instead of 250ms)
            setTimeout(resolve, 150);
        });
    }

    async renderPhotographersAnimated() {
        return new Promise(async (resolve) => {
            // Load photographers data
            this.showLoading(true);
            this.hideBackButton();
            
            DOMHelper.setText('currentPath', this.currentPath);
            DOMHelper.setValue('searchBar', '');
            DOMHelper.showHide('searchBar', true);
            
            try {
                this.photographers = await window.electronAPI.getPhotographers(this.currentPath);
                
                // Clear the grid
                const grid = document.getElementById('contentGrid');
                grid.innerHTML = '';
                
                this.showLoading(false);
                
                if (this.photographers.length === 0) {
                    this.showNoResults(true);
                    resolve();
                    return;
                }
                
                this.showNoResults(false);
                
                // Create all photographer cards
                const cards = [];
                this.photographers.forEach((photographer, index) => {
                    const card = this.createPhotographerCard(photographer, index);
                    // Start hidden for fade-in animation
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    grid.appendChild(card);
                    cards.push(card);
                });
                
                // Trigger staggered fade-in animation (faster)
                setTimeout(() => {
                    cards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('card-fade-in-staggered');
                            
                            // Resolve when last card animation completes
                            if (index === cards.length - 1) {
                                setTimeout(resolve, 200); // Faster than forward animation (200ms vs 300ms)
                            }
                        }, index * 30); // Faster stagger (30ms vs original timing)
                    });
                }, 50); // Shorter initial delay
                
            } catch (error) {
                console.error('Error loading photographers:', error);
                this.showLoading(false);
                resolve();
            }
        });
    }

    resetScrollPosition() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        // Also reset window scroll as fallback
        window.scrollTo(0, 0);
    }


    ensureCleanAnimationState() {
        // Lightweight check to ensure no stale animation classes exist before starting
        const allCards = document.querySelectorAll('.photographer-card, .image-card');
        let hasStaleState = false;
        
        allCards.forEach(card => {
            if (card.classList.contains('card-fade-out') || 
                card.classList.contains('card-slide-to-first') ||
                card.style.transform !== '' ||
                card.style.opacity !== '') {
                hasStaleState = true;
            }
        });
        
        if (hasStaleState) {
            console.warn('Stale animation state detected, forcing cleanup');
            this.forceResetAnimationState();
        }
    }

    forceResetAnimationState() {
        // Force reset all animation state - more aggressive than cleanup
        this.isAnimating = false;
        
        const allCards = document.querySelectorAll('.photographer-card, .image-card');
        allCards.forEach(card => {
            // Remove all animation classes
            card.classList.remove(
                'card-fade-out', 
                'card-slide-to-first', 
                'card-fade-in', 
                'card-fade-in-staggered', 
                'card-disable-hover'
            );
            
            // Force clear all inline styles that could affect animation
            card.style.removeProperty('transform');
            card.style.removeProperty('opacity');
            card.style.removeProperty('animation-delay');
            card.style.removeProperty('z-index');
            card.style.removeProperty('pointer-events');
            
            // Reset title state
            const cardTitle = card.querySelector('.card-title');
            if (cardTitle) {
                cardTitle.classList.remove('card-title-fade-out');
                cardTitle.style.removeProperty('opacity');
            }
            
            // Reset image transforms
            const cardImage = card.querySelector('.card-image');
            if (cardImage) {
                const img = cardImage.querySelector('img');
                if (img) {
                    img.style.removeProperty('transform');
                }
            }
        });
        
        // Clear any running animation timeouts (if we tracked them)
        // Force a reflow to ensure all changes are applied
        document.body.offsetHeight;
    }

    cleanupAnimationClasses() {
        // Remove any animation classes that might be left behind
        const allCards = document.querySelectorAll('.photographer-card, .image-card');
        allCards.forEach(card => {
            card.classList.remove('card-fade-out', 'card-fade-in', 'card-fade-in-staggered', 'card-disable-hover');
            card.style.transform = '';
            card.style.animationDelay = '';
            card.style.opacity = '';
            
            // Clean up title fade classes
            const cardTitle = card.querySelector('.card-title');
            if (cardTitle) {
                cardTitle.classList.remove('card-title-fade-out');
            }
        });
    }

    showBackButton() {
        DOMHelper.setVisible('backButton');
    }

    hideBackButton() {
        DOMHelper.setVisible('backButton', false);
    }

    showLoading(show) {
        DOMHelper.showHide('loadingMessage', show);
    }

    showNoResults(show) {
        DOMHelper.showHide('noResults', show);
    }

    setupHistogramDragging() {
        const histogramDisplay = DOMHelper.get('histogramDisplay');
        
        histogramDisplay.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = histogramDisplay.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            // Prevent text selection and image dragging
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            
            const newX = e.clientX - this.dragOffset.x;
            const newY = e.clientY - this.dragOffset.y;
            
            // Keep histogram within viewport bounds
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const histogramRect = histogramDisplay.getBoundingClientRect();
            
            const constrainedX = Math.max(0, Math.min(newX, viewportWidth - histogramRect.width));
            const constrainedY = Math.max(0, Math.min(newY, viewportHeight - histogramRect.height));
            
            histogramDisplay.style.left = constrainedX + 'px';
            histogramDisplay.style.top = constrainedY + 'px';
            histogramDisplay.style.right = 'auto';
            histogramDisplay.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    // Animation helper methods
    async fadeOutAllCards() {
        return new Promise((resolve) => {
            const allCards = document.querySelectorAll('.photographer-card');

            allCards.forEach(card => {
                card.classList.add('card-fade-out');
            });

            // Wait for fade animation to complete (150ms)
            setTimeout(resolve, 150);
        });
    }

    async fadeOutOtherCards(clickedCard) {
        return new Promise((resolve) => {
            const allCards = document.querySelectorAll('.photographer-card');

            allCards.forEach(card => {
                if (card !== clickedCard) {
                    card.classList.add('card-fade-out');
                }
            });

            // Wait for fade animation to complete (150ms)
            setTimeout(resolve, 150);
        });
    }


    async renderImagesAnimated() {
        const grid = DOMHelper.get('contentGrid');
        grid.innerHTML = '';

        if (this.currentImages.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No images found in this folder.</div>';
            return;
        }

        // Create all image cards at once to prevent layout shifts
        const fragment = document.createDocumentFragment();
        const cards = this.currentImages.map((image, index) => {
            const card = this.createImageCard(image, index);
            
            if (index === 0) {
                // First card (transformed from clicked card) - show immediately without animation
                card.style.opacity = '1';
            } else {
                // Other cards - start hidden for fade-in animation
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
            }
            
            fragment.appendChild(card);
            return card;
        });

        // Add all cards to grid at once to prevent layout recalculation
        grid.appendChild(fragment);

        // Small delay to ensure DOM is ready, then trigger staggered fade-in for cards after the first
        return new Promise((resolve) => {
            if (cards.length <= 1) {
                // If only one card, resolve immediately
                setTimeout(resolve, 50);
                return;
            }
            
            setTimeout(() => {
                cards.forEach((card, index) => {
                    if (index === 0) {
                        // Skip animation for first card
                        return;
                    }
                    
                    setTimeout(() => {
                        card.classList.add('card-fade-in-staggered');
                        
                        // Resolve when last card animation completes
                        if (index === cards.length - 1) {
                            setTimeout(resolve, 300);
                        }
                    }, (index - 1) * 50); // Adjust timing since we skip index 0
                });
            }, 50); // Small delay to prevent flicker
        });
    }
}

// Initialize the app
const app = new PhotographerBrowser();