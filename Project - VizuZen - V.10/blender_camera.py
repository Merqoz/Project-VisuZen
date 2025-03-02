import bpy
import base64
import os
import tempfile
import json
import math
import eel
import bpy.types
import time
import traceback
import functools

# Maximum retry attempts for Blender operations
MAX_RETRIES = 3
RETRY_DELAY = 1.5  # seconds

def safe_blender_operation(func):
    """Decorator to make Blender operations more robust with retry logic"""
    @functools.wraps(func)  # This preserves the original function name and metadata
    def safe_wrapper(*args, **kwargs):
        attempts = 0
        last_error = None
        
        while attempts < MAX_RETRIES:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_error = e
                print(f"Blender operation failed (attempt {attempts+1}/{MAX_RETRIES}): {e}")
                traceback.print_exc()
                attempts += 1
                if attempts < MAX_RETRIES:
                    print(f"Retrying in {RETRY_DELAY} seconds...")
                    time.sleep(RETRY_DELAY)
        
        # If we get here, all retries failed
        print(f"All retry attempts failed for {func.__name__}: {last_error}")
        return {"success": False, "message": f"Operation failed after {MAX_RETRIES} attempts: {str(last_error)}"}
    
    return safe_wrapper  # Return the wrapped function with preserved name

@safe_blender_operation
def capture_viewport_screenshot():
    """Capture a screenshot from the current viewport"""
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Check if Blender is in a valid state for taking a screenshot
        if not bpy.context.window_manager or not bpy.context.window_manager.windows:
            raise Exception("Blender window manager is not in a valid state")
        
        # Save viewport screenshot
        bpy.ops.screen.screenshot(filepath=temp_path, full=False)
        
        # Read image and convert to base64
        with open(temp_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
        # Clean up
        os.unlink(temp_path)
        
        return img_data
    except Exception as e:
        print(f"Error capturing viewport screenshot: {e}")
        traceback.print_exc()
        return None

@safe_blender_operation
def render_camera_view(camera_obj):
    """Render an image from the camera's perspective"""
    try:
        # Check if camera object exists and is valid
        if not camera_obj or camera_obj.type != 'CAMERA':
            raise Exception("Invalid camera object")
            
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Store original settings
        original_camera = bpy.context.scene.camera
        original_filepath = bpy.context.scene.render.filepath
        original_resolution_x = bpy.context.scene.render.resolution_x
        original_resolution_y = bpy.context.scene.render.resolution_y
        original_percentage = bpy.context.scene.render.resolution_percentage
        
        # Set render settings
        bpy.context.scene.camera = camera_obj
        bpy.context.scene.render.filepath = temp_path
        bpy.context.scene.render.resolution_x = 800  # Lower resolution for faster preview
        bpy.context.scene.render.resolution_y = 600
        bpy.context.scene.render.resolution_percentage = 50
        
        # Render
        bpy.ops.render.render(write_still=True)
        
        # Restore original settings
        bpy.context.scene.camera = original_camera
        bpy.context.scene.render.filepath = original_filepath
        bpy.context.scene.render.resolution_x = original_resolution_x
        bpy.context.scene.render.resolution_y = original_resolution_y
        bpy.context.scene.render.resolution_percentage = original_percentage
        
        # Read image and convert to base64
        with open(temp_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
        # Clean up
        os.unlink(temp_path)
        
        return img_data
    except Exception as e:
        print(f"Error rendering camera view: {e}")
        traceback.print_exc()
        return None

@eel.expose
@safe_blender_operation
def get_all_cameras_in_scene():
    """Get all camera objects in the current Blender scene"""
    try:
        cameras = []
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA':
                camera_data = {
                    "name": obj.name,
                    "position": {
                        "x": obj.location.x,
                        "y": obj.location.y,
                        "z": obj.location.z
                    },
                    "rotation": {
                        "x": obj.rotation_euler.x,
                        "y": obj.rotation_euler.y,
                        "z": obj.rotation_euler.z
                    }
                }
                cameras.append(camera_data)
        
        return {"success": True, "cameras": cameras}
    except Exception as e:
        print(f"Error getting cameras: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def add_camera_at_current_view(section_id, camera_number, frame, render_preview=False):
    """Add a camera at the current view in Blender"""
    try:
        # Create a new camera
        camera_data = bpy.data.cameras.new(f"Camera_{section_id}_{camera_number}")
        camera_obj = bpy.data.objects.new(f"Camera_{section_id}_{camera_number}", camera_data)
        
        # Link the camera to the scene
        bpy.context.scene.collection.objects.link(camera_obj)
        
        # Find active 3D viewport
        view3d = None
        region3d = None
        
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    for space in area.spaces:
                        if space.type == 'VIEW_3D':
                            view3d = space
                            region3d = space.region_3d
                            break
                    if view3d:
                        break
            if view3d:
                break
                
        if not view3d or not region3d:
            raise Exception("No active 3D viewport found")
        
        # Copy view to camera
        camera_obj.matrix_world = region3d.view_matrix.inverted()
        
        # Get camera position and rotation
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        
        # Add custom properties to the camera
        camera_obj["section_id"] = section_id
        camera_obj["camera_number"] = camera_number
        camera_obj["camera_frame"] = frame
        camera_obj["camera_name"] = f"Camera {camera_number}"
        
        # Capture preview image (either simple screenshot or rendered view)
        preview_image = None
        if render_preview:
            preview_image = render_camera_view(camera_obj)
        else:
            preview_image = capture_viewport_screenshot()
        
        # Create camera data for UI
        camera_data = {
            "name": f"Camera {camera_number}",
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": frame,
            "preview_image": preview_image,
            "blender_name": camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error adding camera: {e}")
        traceback.print_exc()
        
        # Attempt cleanup on error
        try:
            # Check if camera was created but not fully set up
            camera_name = f"Camera_{section_id}_{camera_number}"
            for obj in bpy.data.objects:
                if obj.name == camera_name and obj.type == 'CAMERA':
                    bpy.data.objects.remove(obj)
        except:
            pass
            
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def link_existing_camera(section_id, camera_number, camera_name, frame):
    """Link an existing camera to the section"""
    try:
        # Find the camera by name
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.name == camera_name:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": f"Camera '{camera_name}' not found"}
        
        # Add custom properties to the camera
        camera_obj["section_id"] = section_id
        camera_obj["camera_number"] = camera_number
        camera_obj["camera_frame"] = frame
        camera_obj["camera_name"] = f"Camera {camera_number}"
        
        # Capture preview image
        preview_image = render_camera_view(camera_obj)
        
        # Get camera position and rotation
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        
        # Create camera data for UI
        camera_data = {
            "name": camera_obj.name,
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": frame,
            "preview_image": preview_image,
            "blender_name": camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error linking camera: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def update_camera_from_current_view(section_id, camera_number, frame, render_preview=False):
    """Update an existing camera from the current view"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Find active 3D viewport
        view3d = None
        region3d = None
        
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    for space in area.spaces:
                        if space.type == 'VIEW_3D':
                            view3d = space
                            region3d = space.region_3d
                            break
                    if view3d:
                        break
            if view3d:
                break
                
        if not view3d or not region3d:
            raise Exception("No active 3D viewport found")
        
        # Copy view to camera
        camera_obj.matrix_world = region3d.view_matrix.inverted()
        
        # Update camera properties
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        camera_obj["camera_frame"] = frame
        
        # Capture preview image (either simple screenshot or rendered view)
        preview_image = None
        if render_preview:
            preview_image = render_camera_view(camera_obj)
        else:
            preview_image = capture_viewport_screenshot()
        
        # Create updated camera data for UI
        camera_data = {
            "name": camera_obj.name,
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": frame,
            "preview_image": preview_image,
            "blender_name": camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error updating camera: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def change_camera_view(section_id, camera_number, new_camera_name):
    """Change the camera view to another existing camera"""
    try:
        # Find the new camera object
        new_camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.name == new_camera_name:
                new_camera_obj = obj
                break
        
        if not new_camera_obj:
            return {"success": False, "message": f"Camera '{new_camera_name}' not found"}
        
        # Get current frame
        current_frame = bpy.context.scene.frame_current
        
        # Update custom properties
        new_camera_obj["section_id"] = section_id
        new_camera_obj["camera_number"] = camera_number
        new_camera_obj["camera_frame"] = current_frame
        new_camera_obj["camera_name"] = f"Camera {camera_number}"
        
        # Capture preview image
        preview_image = render_camera_view(new_camera_obj)
        
        # Get camera properties
        pos = new_camera_obj.location
        rot = new_camera_obj.rotation_euler
        
        # Create updated camera data for UI
        camera_data = {
            "name": new_camera_obj.name,
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": current_frame,
            "preview_image": preview_image,
            "blender_name": new_camera_obj.name
        }
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error changing camera view: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def jump_to_camera_view(section_id, camera_number):
    """Jump to a specific camera view in Blender"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Set the active camera
        bpy.context.scene.camera = camera_obj
        
        # Change to camera view in all 3D viewports
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces[0].region_3d.view_perspective = 'CAMERA'
        
        # Set frame if camera has one
        if camera_obj.get("camera_frame"):
            bpy.context.scene.frame_set(camera_obj["camera_frame"])
        
        return {"success": True}
    except Exception as e:
        print(f"Error jumping to camera view: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def remove_camera_reference(section_id, camera_number):
    """Remove a camera reference from a section without deleting the camera from Blender"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Just remove our reference properties but don't delete the camera
        # This allows cameras to be reused across different sections
        if "section_id" in camera_obj:
            del camera_obj["section_id"]
        if "camera_number" in camera_obj:
            del camera_obj["camera_number"]
        if "camera_frame" in camera_obj:
            del camera_obj["camera_frame"]
        if "camera_name" in camera_obj:
            del camera_obj["camera_name"]
        
        return {"success": True}
    except Exception as e:
        print(f"Error removing camera reference: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def delete_camera(section_id, camera_number, delete_from_blender=False):
    """Delete a camera from Blender"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        if delete_from_blender:
            # Actually delete the camera from Blender
            camera_data = camera_obj.data
            bpy.data.objects.remove(camera_obj)
            bpy.data.cameras.remove(camera_data)
        else:
            # Just remove our reference properties but don't delete the camera
            if "section_id" in camera_obj:
                del camera_obj["section_id"]
            if "camera_number" in camera_obj:
                del camera_obj["camera_number"]
            if "camera_frame" in camera_obj:
                del camera_obj["camera_frame"]
            if "camera_name" in camera_obj:
                del camera_obj["camera_name"]
        
        return {"success": True}
    except Exception as e:
        print(f"Error deleting camera: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}

@eel.expose
@safe_blender_operation
def get_camera_data(section_id, camera_number):
    """Get data for a specific camera"""
    try:
        # Find the camera
        camera_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'CAMERA' and obj.get("section_id") == section_id and obj.get("camera_number") == camera_number:
                camera_obj = obj
                break
        
        if not camera_obj:
            return {"success": False, "message": "Camera not found"}
        
        # Get camera properties
        pos = camera_obj.location
        rot = camera_obj.rotation_euler
        
        # Create camera data for UI
        camera_data = {
            "name": camera_obj.name,
            "position": {"x": pos.x, "y": pos.y, "z": pos.z},
            "rotation": {"x": rot.x, "y": rot.y, "z": rot.z},
            "frame": camera_obj.get("camera_frame", 0),
            "blender_name": camera_obj.name
        }
        
        # Try to get a new preview image
        preview_image = render_camera_view(camera_obj)
        if preview_image:
            camera_data["preview_image"] = preview_image
        
        return {"success": True, "camera_data": camera_data}
    except Exception as e:
        print(f"Error getting camera data: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}