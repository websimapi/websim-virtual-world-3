import { config } from './config.js';
import { World } from './world.js';
import { Avatar } from './avatar.js';
import { Building } from './building.js';
import { UI } from './ui.js';

class VirtualWorld {
    constructor() {
        // Initialize WebsimSocket
        this.room = new WebsimSocket();
        
        // Initialize Three.js
        this.initializeThreeJS();
        
        // Initialize UI
        this.ui = new UI(this.room);
        
        // Initialize components after room connection
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize WebSocket connection
            await this.room.initialize();
            
            // Initialize world
            this.world = new World(this.scene, this.room);
            
            // Initialize avatar
            this.avatar = new Avatar(this.scene, this.camera, this.room);
            
            // Initialize building system
            this.building = new Building(this.scene, this.camera, this.world, this.ui);
            
            // Connect UI to building system
            this.ui.setObjectTypeCallback(this.building.selectObjectType.bind(this.building));
            this.ui.setPropertyChangeCallback(this.building.updateProperties.bind(this.building));
            
            // Hide loading screen
            this.ui.hideLoadingScreen();
            
            // Start animation loop
            this.animate();
        } catch (error) {
            console.error('Failed to initialize virtual world:', error);
        }
    }
    
    initializeThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        // Add lights
        this.addLights();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 200, 100);
        directionalLight.castShadow = true;
        
        // Set up shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 10;
        directionalLight.shadow.camera.far = 400;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        
        this.scene.add(directionalLight);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = Math.min(0.1, this.clock ? (Date.now() - this.clock) / 1000 : 0.016);
        this.clock = Date.now();
        
        // Update components
        if (this.avatar) this.avatar.update(deltaTime);
        if (this.building) this.building.update();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the virtual world when the page loads
window.addEventListener('load', () => {
    window.virtualWorld = new VirtualWorld();
});

