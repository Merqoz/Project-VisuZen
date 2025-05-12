import os
import bpy

# Print current working directory
print("Current working directory:", os.getcwd())

# Get the directory of the current script
current_dir = bpy.path.abspath("//")
print("Script directory:", current_dir)


####################################################################
# Full path for script - blender tools - UI in blender
script1_path = os.path.join(current_dir, 'blender_tools.py')
print("Trying to open:", script1_path)

try:
    with open(script1_path, 'r') as file:
        exec(file.read())
except FileNotFoundError:
    print(f"Could not find file: {script1_path}")


# Execute script - Webbrowser UI and navigation 
## Table, and timlelinemanager
script2_path = os.path.join(current_dir, 'eel_Blender_Content.py')
print("Trying to open:", script2_path)

try:
    with open(script2_path, 'r') as file:
        exec(file.read())
except FileNotFoundError:
    print(f"Could not find file: {script2_path}")


# Execute script - Bledner pie-menu - popupbox showing
script3_path = os.path.join(current_dir, 'blender_pie_menu_v01.py')
print("Trying to open:", script3_path)

try:
    with open(script3_path, 'r') as file:
        exec(file.read())
except FileNotFoundError:
    print(f"Could not find file: {script3_path}")
    

# Execute script - Bledner pie-menu - popupbox showing
script4_path = os.path.join(current_dir, 'blender_camera.py')
print("Trying to open:", script4_path)

try:
    with open(script4_path, 'r') as file:
        exec(file.read())
except FileNotFoundError:
    print(f"Could not find file: {script4_path}")

