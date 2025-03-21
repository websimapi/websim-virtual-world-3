import { config } from './config.js';

export class Building {
    constructor(scene, camera, world, ui) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.ui = ui;
        this.buildMode = false;
        this.selectedObjectType = null;
        this.previewMesh = null;
        this.selectedProperties = {
            color: 0x4bb3fd,
            width: 5,
            height: 5,
            depth: 5,
            radius: 2.5
        };
        
        // Set up controls
        this.setupControls();
        
        // Create build ghost (preview)
        this.createPreviewMesh();
    }
    
    setupControls() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyB') {
                this.toggleBuildMode();
            }
        });
        
        document.addEventListener('click', (event) => {
            if (this.buildMode && event.button === 0 && document.pointerLockElement) {
                this.placeObject();
            }
        });
        
        document.addEventListener('contextmenu', (event) => {
            if (this.buildMode && document.pointerLockElement) {
                event.preventDefault();
                this.removeSelectedObject();
            }
        });
    }
    
    toggleBuildMode() {
        this.buildMode = !this.buildMode;
        
        if (this.buildMode) {
            this.ui.showBuildPanel();
            this.selectObjectType('cube');
        } else {
            this.ui.hideBuildPanel();
            this.hidePreviewMesh();
        }
    }
    
    createPreviewMesh() {
        // Create a transparent preview mesh
        const geometry = new THREE.BoxGeometry(5, 5, 5);
        const material = new THREE.MeshStandardMaterial({
            color: 0x4bb3fd,
            transparent: true,
            opacity: 0.5
        });
        
        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewMesh.visible = false;
        this.scene.add(this.previewMesh);
    }
    
    updatePreviewMesh() {
        if (!this.selectedObjectType || !this.buildMode) {
            this.hidePreviewMesh();
            return;
        }
        
        // Update geometry based on selected type and properties
        let geometry;
        
        switch (this.selectedObjectType) {
            case 'cube':
                geometry = new THREE.BoxGeometry(
                    this.selectedProperties.width,
                    this.selectedProperties.height,
                    this.selectedProperties.depth
                );
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(this.selectedProperties.radius, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(
                    this.selectedProperties.radius,
                    this.selectedProperties.radius,
                    this.selectedProperties.height,
                    32
                );
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(
                    this.selectedProperties.radius,
                    this.selectedProperties.height,
                    32
                );
                break;
            default:
                geometry = new THREE.BoxGeometry(5, 5, 5);
                break;
        }
        
        // Update the preview mesh
        this.previewMesh.geometry.dispose();
        this.previewMesh.geometry = geometry;
        this.previewMesh.material.color.set(this.selectedProperties.color);
        this.previewMesh.visible = true;
    }
    
    hidePreviewMesh() {
        if (this.previewMesh) {
            this.previewMesh.visible = false;
        }
    }
    
    updatePreviewPosition() {
        if (!this.buildMode || !this.previewMesh || !this.previewMesh.visible) return;
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const raycaster = new THREE.Raycaster(this.camera.position, direction);
        const intersects = raycaster.intersectObjects(this.scene.children, false);
        
        let position;
        
        if (intersects.length > 0 && intersects[0].distance <= config.maxBuildDistance) {
            position = intersects[0].point;
            
            // Snap to grid
            position.x = Math.round(position.x / config.gridSize) * config.gridSize;
            position.z = Math.round(position.z / config.gridSize) * config.gridSize;
            
            // Adjust Y position based on object type
            switch (this.selectedObjectType) {
                case 'cube':
                    position.y = position.y + this.selectedProperties.height / 2;
                    break;
                case 'sphere':
                    position.y = position.y + this.selectedProperties.radius;
                    break;
                case 'cylinder':
                case 'cone':
                    position.y = position.y + this.selectedProperties.height / 2;
                    break;
                default:
                    position.y = position.y + 2.5;
                    break;
            }
            
            this.previewMesh.position.copy(position);
        } else {
            // Position the preview at max distance in front of the camera
            position = this.camera.position.clone().add(
                direction.multiplyScalar(config.maxBuildDistance)
            );
            
            // Snap to grid
            position.x = Math.round(position.x / config.gridSize) * config.gridSize;
            position.z = Math.round(position.z / config.gridSize) * config.gridSize;
            position.y = Math.round(position.y / config.gridSize) * config.gridSize;
            
            this.previewMesh.position.copy(position);
        }
    }
    
    selectObjectType(type) {
        this.selectedObjectType = type;
        this.ui.updateBuildSelection(type);
        this.updatePreviewMesh();
    }
    
    updateProperties(properties) {
        this.selectedProperties = { ...this.selectedProperties, ...properties };
        this.updatePreviewMesh();
    }
    
    placeObject() {
        if (!this.buildMode || !this.selectedObjectType || !this.previewMesh.visible) return;
        
        // Get position from preview mesh
        const position = this.previewMesh.position.clone();
        
        // Place object in the world
        this.world.placeObject(this.selectedObjectType, position, {
            ...this.selectedProperties,
            rotationY: 0
        });
    }
    
    removeSelectedObject() {
        if (!this.buildMode) return;
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const raycaster = new THREE.Raycaster(this.camera.position, direction);
        const intersects = raycaster.intersectObjects(Object.values(this.world.objects).map(obj => obj.mesh), false);
        
        if (intersects.length > 0 && intersects[0].distance <= config.maxBuildDistance) {
            const selectedObject = intersects[0].object;
            const objectId = selectedObject.userData.id;
            
            if (objectId) {
                this.world.removeObject(objectId);
            }
        }
    }
    
    update() {
        if (this.buildMode) {
            this.updatePreviewPosition();
        }
    }
}

