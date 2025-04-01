###################################################################### Interactive Spreadsheet
import bpy
import os
import subprocess


# Operator to add a new row with predefined columns to the selected object
class AddStringRowToObjectOperator(bpy.types.Operator):
    bl_idname = "object.add_string_row"
    bl_label = "Add String Row to Object"

    def execute(self, context):
        obj = context.object
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}

        # Determine the next row index
        i = 1
        while any(f"custom_string_{i}_{col}" in obj.keys() for col in range(1, 5)):
            i += 1

        # Add new properties for each column in the row
        for col in range(1, 5):
            obj[f"custom_string_{i}_{col}"] = f"Row{i}Col{col}"

        self.report({'INFO'}, "Added new string row to object")
        return {'FINISHED'}


class OBJECT_OT_open_filebrowser(bpy.types.Operator):
    """Open the file browser and store the selected file path for a specific row"""
    bl_idname = "object.open_filebrowser"
    bl_label = "Choose File"

    # Define the properties for the file browser
    filepath: bpy.props.StringProperty(subtype="FILE_PATH")
    filter_glob: bpy.props.StringProperty(default="*.*", options={'HIDDEN'})
    
    # Define row_index property
    row_index: bpy.props.IntProperty()  # This line is crucial

    def execute(self, context):
        obj = context.object
        if obj:
            prop_name = f"custom_file_{self.row_index}"
            obj[prop_name] = self.filepath
            self.report({'INFO'}, f"File path stored for row {self.row_index}: {self.filepath}")
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}





class OBJECT_OT_open_file(bpy.types.Operator):
    """Open the selected file"""
    bl_idname = "object.open_file"
    bl_label = "Open File"

    file_path: bpy.props.StringProperty()

    def execute(self, context):
        if self.file_path:
            # For Windows
            if os.name == 'nt':
                os.startfile(self.file_path)
            # For macOS
            elif os.name == 'posix':
                subprocess.call(('open', self.file_path))
            # For Linux
            else:
                subprocess.call(('xdg-open', self.file_path))
            self.report({'INFO'}, f"Opening file: {self.file_path}")
        else:
            self.report({'ERROR'}, "No file path provided")
        return {'FINISHED'}



class RemoveStringRowFromObjectOperator(bpy.types.Operator):
    bl_idname = "object.remove_string_row"
    bl_label = "Remove String Row from Object"

    def execute(self, context):
        obj = context.object
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}

        # Find the highest index of the custom string rows
        max_index = -1
        for key in obj.keys():
            if key.startswith("custom_string_"):
                index = int(key.split("_")[2])
                max_index = max(max_index, index)

        # If no custom string properties were found, report and exit
        if max_index == -1:
            self.report({'INFO'}, "No custom string rows to remove")
            return {'CANCELLED'}

        # Remove properties for the highest index found
        for col in range(1, 5):
            prop_name = f"custom_string_{max_index}_{col}"
            if prop_name in obj.keys():
                del obj[prop_name]

        self.report({'INFO'}, f"Removed string row {max_index} from object")
        return {'FINISHED'}



# Operator to rename the object
class RenameObjectOperator(bpy.types.Operator):
    bl_idname = "object.rename_object"
    bl_label = "Rename Object"

    new_name: bpy.props.StringProperty(name="New Name")

    def execute(self, context):
        obj = context.object
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}

        obj.name = self.new_name

        self.report({'INFO'}, f"Object renamed to '{self.new_name}'")
        return {'FINISHED'}


class DeleteStringRowFromObjectOperator(bpy.types.Operator):
    bl_idname = "object.delete_string_row"
    bl_label = "Delete String Row from Object"
    row_index: bpy.props.IntProperty()  # Row index to delete

    def execute(self, context):
        obj = context.object
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}

        base_prop_name_to_delete = f"custom_string_{self.row_index}_"
        file_prop_name_to_delete = f"custom_file_{self.row_index}"

        # Delete properties related to the specified row
        for key in list(obj.keys()):
            if key.startswith(base_prop_name_to_delete) or key == file_prop_name_to_delete:
                del obj[key]

        # Reindex the rows after the deleted row
        max_index = self.find_max_row_index(obj)
        for i in range(self.row_index + 1, max_index + 1):
            for col in range(1, 5):
                old_key = f"custom_string_{i}_{col}"
                new_key = f"custom_string_{i - 1}_{col}"
                if old_key in obj:
                    obj[new_key] = obj[old_key]
                    del obj[old_key]

            old_file_key = f"custom_file_{i}"
            new_file_key = f"custom_file_{i - 1}"
            if old_file_key in obj:
                obj[new_file_key] = obj[old_file_key]
                del obj[old_file_key]

        self.report({'INFO'}, f"Deleted data for row {self.row_index} and reindexed subsequent rows.")
        return {'FINISHED'}

    def find_max_row_index(self, obj):
        max_index = 0
        for key in obj.keys():
            if key.startswith("custom_string_"):
                index = int(key.split("_")[2])
                max_index = max(max_index, index)
        return max_index



# Modified Panel to display and edit the rows with custom column names
class CustomObjectSpreadsheetPanel(bpy.types.Panel):
    bl_label = "Object Spreadsheet"
    bl_idname = "VIEW3D_PT_custom_object_spreadsheet"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Spreadsheet'

    def draw(self, context):
        layout = self.layout
        obj = context.object

        if obj:
            # Rename object functionality remains unchanged
            row = layout.row()
            row.prop(obj, "name", text="Object")
            row.prop(obj, "mn_custom_string", text="MN")
            # Small space between info box and below
            layout.separator()                        
            row = layout.row(align=True)
            # Dropdown list remains unchanged
            row.prop(obj, "dropdown_list2")
            
            # Dropdown list remains unchanged
            row.prop(obj, "dropdown_list1")


            # Small space between info box and below
            layout.separator()
            row = layout.row(align=True)
            row.operator("object.add_string_row", text="Add Document", icon='ADD')



            row = layout.row()
            row.label(text="Doc")  # Adjusted placeholder for row numbers
            custom_column_names = ["Description", "SAP Dir", "Status","Version", "Local File"]
            for name in custom_column_names:
                row.label(text=name)


            #### Revisist this link https://chat.openai.com/c/060b0551-a44d-4e2f-b43c-fad2beb47471
            # Display rows with custom named columns and file select button
            j = 1
            while any(f"custom_string_{j}_{col}" in obj.keys() for col in range(1, 5)):  # Adjusted for 3 columns + file
                row = layout.row()
                row.label(text=f"Doc{j}")
                for col in range(1, 5):  # Only iterate over the first three columns
                    prop_name = f'custom_string_{j}_{col}'
                    row.prop(obj, f'["{prop_name}"]', text="")

                # File selection button and display for each row
                file_prop_name = f"custom_file_{j}"
                file_path = obj.get(file_prop_name, "")
                op = row.operator("object.open_filebrowser", text="Select File", icon='FILE_FOLDER')
                op.row_index = j  # Pass the row index to the operator

                if file_path:
                    op = row.operator("object.open_file", text="", icon='FILE_TICK')
                    op.file_path = file_path
                else:
                    row.label(text="", icon='FILE_BLANK')
                
                # Add the delete button here
                op_del = row.operator("object.delete_string_row", text="", icon='TRASH')
                op_del.row_index = j  # Pass the current row index to the delete operator
                
                
                j += 1
        else:
            layout.label(text="No object selected.")



# Registration function remains mostly unchanged
def register():
    bpy.utils.register_class(AddStringRowToObjectOperator)
    bpy.utils.register_class(RemoveStringRowFromObjectOperator)
    bpy.utils.register_class(RenameObjectOperator)
    bpy.utils.register_class(OBJECT_OT_open_filebrowser)
    bpy.utils.register_class(OBJECT_OT_open_file)
    bpy.utils.register_class(CustomObjectSpreadsheetPanel)
    bpy.utils.register_class(DeleteStringRowFromObjectOperator)
    bpy.types.Object.dropdown_list1 = bpy.props.EnumProperty(
        items=[('0', 'WP_X', ''), ('1', 'WP03', ''), ('2', 'WP04', ''), ('3', 'WP05', ''), ('4', 'WP06', ''), ('5', 'WP07', ''), ('6', 'WP08', ''), ('7', 'WP09', ''), ('8', 'WP10', ''), ('9', 'RTP', ''), ('10', 'CPI', '')],
        name="")
    bpy.types.Object.dropdown_list2 = bpy.props.EnumProperty(items=[('0', '-', ''), ('1', 'Main Equipment', ''), ('2', 'Tools', ''), ('3', 'Auxillary Equipment', '')], name="")
    
    bpy.types.Object.mn_custom_string = bpy.props.StringProperty(
        name="MN",
        description="Custom MN String",
        default=""
    )


def unregister():
    bpy.utils.unregister_class(AddStringRowToObjectOperator)
    bpy.utils.unregister_class(RemoveStringRowFromObjectOperator)
    bpy.utils.unregister_class(RenameObjectOperator)
    bpy.utils.unregister_class(OBJECT_OT_open_file)
    bpy.utils.unregister_class(OBJECT_OT_open_filebrowser)
    bpy.utils.unregister_class(DeleteStringRowFromObjectOperator)
    bpy.utils.unregister_class(CustomObjectSpreadsheetPanel)
    del bpy.types.Object.dropdown_list
    # Unregister the "MN" custom string property
    del bpy.types.Object.mn_custom_string

if __name__ == "__main__":
    register()


#################################################################################### Static Data - object data table




import bpy
import webbrowser

def open_url(url):
    webbrowser.open(url)

class OpenHyperlinkOperator(bpy.types.Operator):
    """Open the specified URL in the web browser"""
    bl_idname = "wm.open_hyperlink"
    bl_label = "Open Hyperlink"
    
    url: bpy.props.StringProperty()

    def execute(self, context):
        open_url(self.url)
        return {'FINISHED'}

class StaticDataPanel(bpy.types.Panel):
    bl_label = "Object Data"
    bl_idname = "VIEW3D_PT_object_data"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'StaticData'

    def draw(self, context):
        layout = self.layout
        obj = context.object

        if obj:
            layout.label(text=f"Object Name: {obj.name}", icon='OBJECT_DATA')
            
            split = layout.split(factor=0.3)
            mn_value = obj.get('mn_custom_string', 'N/A')
            split.label(text=f'MN: {mn_value}', icon='MONKEY')
            split.operator("wm.open_hyperlink", text=f"{mn_value}").url = f"http://www.{mn_value}.com/"
            split.label(text='')

            row = layout.row(align=True)
            split = layout.split(factor=0.3)
            item1 = ['-','Main Equipment', 'Tools', 'Auxillary Equipment']
            item2 = ['WP_X', 'WP03', 'WP04', 'WP05', 'WP06','WP07','WP08', 'WP09', 'WP10','RTP', 'CPI']
            dropdown1_value = obj.get("dropdown_list1", 0)
            dropdown2_value = obj.get("dropdown_list2", 0)
            n1 = item1[int(dropdown2_value)]
            n2 = item2[int(dropdown1_value)]
            split.label(text=f"Type: {n1}", icon='INFO')
            split.label(text=f"Workpackage: {n2}", icon='INFO')

            layout.separator()

            custom_column_names = ["Description", "SAP Dir", "Status", "Version"]
            row = layout.row()
            row.label(icon="WORLD_DATA")
            row.label(icon="FILEBROWSER")
            for name in custom_column_names:
                row.label(text=name)

            
            i = 1
            while any(f"custom_string_{i}_{col}" in obj.keys() for col in range(1, 5)):
                row = layout.row()
                prop_name_sap_dir = f'custom_string_{i}_2'  # Assuming SAP Dir is the second column
                sap_dir_value = obj.get(prop_name_sap_dir, 'N/A')
                
                # Create a button with the document identifier that opens the SAP Dir URL
                if sap_dir_value != 'N/A':
                    button_text = ""
                    op = row.operator("wm.open_hyperlink", text=button_text, icon="URL")
                    op.url = f"http://www.{sap_dir_value}.com/" ## Attach HYperlink here
                else:
                    row.label(text=f"", icon='URL')
              
              
              
                # File selection button and display for each row
                file_prop_name = f"custom_file_{i}"
                file_path = obj.get(file_prop_name, "")
                
                if file_path:
                    op = row.operator("object.open_file", text="", icon='FILE_TICK')
                    op.file_path = file_path
                else:
                    row.label(text="", icon='FILE_BLANK')
                    
                    
                # Display other property values (Stated before) 4 columns (1-5)
                for col in range(1, 5):
                        prop_name = f'custom_string_{i}_{col}'
                        value = obj.get(prop_name, 'N/A')
                        row.label(text=value)        
                i += 1
        else:
            layout.label(text="No object selected.")

def register():
    bpy.utils.register_class(OpenHyperlinkOperator)
    bpy.utils.register_class(StaticDataPanel)

def unregister():
    bpy.utils.unregister_class(OpenHyperlinkOperator)
    bpy.utils.unregister_class(StaticDataPanel)

if __name__ == "__main__":
    register()








######################################################################################## Object highlight - list
import bpy


class OBJECT_OT_SelectByName(bpy.types.Operator):
    """Select an object by its name and focus on it"""
    bl_idname = "object.select_by_name"
    bl_label = "Select Object By Name"

    object_name: bpy.props.StringProperty()
    item_index: bpy.props.IntProperty()  # Add this line

    def execute(self, context):
        bpy.ops.object.select_all(action='DESELECT')
        
        obj = context.scene.objects.get(self.object_name)
        if obj:
            obj.select_set(True)
            context.view_layer.objects.active = obj
            context.scene.list_index = self.item_index  # Update the list_index
        else:
            self.report({'WARNING'}, f"Object '{self.object_name}' not found")
        
        return {'FINISHED'}



def update_object_list(self, context):
    scene = context.scene
    selected_category = scene.my_tool.selected_tab
    # Clear existing list
    scene.object_list.clear()
    # Populate list based on selected tab
    for obj in scene.objects:
        # Assuming `dropdown_list2` stores the category as string equivalent of the index
        if hasattr(obj, "dropdown_list2") and str(obj.dropdown_list2) == selected_category:
            item = scene.object_list.add()
            item.name = obj.name


class MyToolPropertyGroup(bpy.types.PropertyGroup):
    selected_tab: bpy.props.EnumProperty(
        items=[
            ('1', "Main Equipment", ""),
            ('2', "Tools", ""),
            ('3', "Auxiliary Equipment", ""),
        ],
        default='1',
        update=update_object_list
    )


class OBJECT_OT_ToggleVisibility(bpy.types.Operator):
    """Toggle an object's visibility"""
    bl_idname = "object.toggle_visibility"
    bl_label = "Toggle Object Visibility"

    object_name: bpy.props.StringProperty()

    def execute(self, context):
        # Find the object by name
        obj = context.scene.objects.get(self.object_name)
        if obj:
            # Toggle the visibility
            obj.hide_viewport = not obj.hide_viewport
        else:
            self.report({'WARNING'}, f"Object '{self.object_name}' not found")

        return {'FINISHED'}



class SCENE_UL_ObjectList(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        # This method draws each item in the list
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            
            obj = context.scene.objects.get(item.name)

            if obj:
                
                if obj == context.view_layer.objects.active:
                    # Here, we use a different icon or text style for the active object
                    icon = 'RADIOBUT_ON'
                else:
                    icon = 'RADIOBUT_OFF'

                # Display the object's name with an icon indicating its selection state
                layout.label(icon=icon)
                split = layout.split(factor=0.8)
                select_op = split.operator("object.select_by_name", text=item.name, emboss=False)
                select_op.object_name = item.name
                
                
                split = layout.split(factor=0.5)
                # Add button to focus the 3D view on the object
                focus_op = split.operator("object.focus_on_object", text="", icon='VIEWZOOM', emboss=False)
                focus_op.object_name = item.name
                select_op.item_index = index  # Pass the index here
                
                
                split = layout.split(factor=0.5)
                # Determine the visibility icon based on the object's current visibility state
                visibility_icon = 'HIDE_ON' if obj.hide_viewport else 'HIDE_OFF'
                # Add button to toggle the object's visibility with the appropriate icon
                visibility_op = split.operator("object.toggle_visibility", text="", icon=visibility_icon, emboss=False)
                visibility_op.object_name = item.name

            else:
                # If the object was not found (which should not normally happen), just display its name
                split.label(text="Missing Object!", icon='ERROR')
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(text="")


class OBJECT_PT_CustomPanel(bpy.types.Panel):
    bl_idname = "OBJECT_PT_custom_panel"
    bl_label = "Object in Scene"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'StaticData'

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        my_tool = scene.my_tool

        # Existing tab selection and template list
        layout.prop(my_tool, "selected_tab", expand=True)
        # New button to collect all categorized objects
        layout.operator("object.collect_all_categorized_objects", text="Collect All Categorized Objects")
        
        #List view of objects
        layout.template_list("SCENE_UL_ObjectList", "The_List", scene, "object_list", scene, "list_index")



class OBJECT_OT_CollectObjects(bpy.types.Operator):
    """Collect objects based on the selected category"""
    bl_idname = "object.collect_objects"
    bl_label = "Collect Objects"
    
    
    def execute(self, context):
        update_object_list(context.scene.my_tool, context)
        return {'FINISHED'}


class OBJECT_OT_CollectAllCategorizedObjects(bpy.types.Operator):
    """Collect all objects with a category"""
    bl_idname = "object.collect_all_categorized_objects"
    bl_label = "Collect All Categorized Objects"
    
    def execute(self, context):
        scene = context.scene
        scene.object_list.clear()

        # Fetch objects with dropdown_list2 set to 1, 2, or 3
        for obj in scene.objects:
            if "dropdown_list2" in obj and obj["dropdown_list2"] in {1, 2, 3}:
                item = scene.object_list.add()
                item.name = obj.name

        return {'FINISHED'}




###object class focus on OBJ
class OBJECT_OT_FocusOnObject(bpy.types.Operator):
    """Focus the 3D View on the selected object"""
    bl_idname = "object.focus_on_object"
    bl_label = "Focus on Object"

    object_name: bpy.props.StringProperty()

    def execute(self, context):
        obj = context.scene.objects.get(self.object_name)
        if obj:
            # Ensure the object is selected and active
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            context.view_layer.objects.active = obj

            # Change the area to 3D View temporarily if not already
            view3d_area = next((area for area in context.screen.areas if area.type == 'VIEW_3D'), context.area)
            original_area_type = context.area.type
            context.area.type = 'VIEW_3D'

            # Use the view_selected operator to focus on the object
            bpy.ops.view3d.view_selected(use_all_regions=False)
            
            # Attempt to zoom out by adjusting the view distance directly in the region's 3D view
            if view3d_area.spaces.active.region_3d.view_distance < 1000:
                view3d_area.spaces.active.region_3d.view_distance *= 5  # Adjust this factor to control zoom level

            # Restore the original area type if we had changed it
            if view3d_area != context.area:
                context.area.type = original_area_type
            
            
            # Restore the original area type
            context.area.type = original_area_type

        else:
            self.report({'WARNING'}, f"Object '{self.object_name}' not found")
        return {'FINISHED'}

def register():
    bpy.utils.register_class(MyToolPropertyGroup)
    bpy.types.Scene.my_tool = bpy.props.PointerProperty(type=MyToolPropertyGroup)

    bpy.utils.register_class(OBJECT_OT_CollectObjects)
    bpy.utils.register_class(OBJECT_OT_CollectAllCategorizedObjects)
    bpy.utils.register_class(SCENE_UL_ObjectList)
    bpy.utils.register_class(OBJECT_PT_CustomPanel)
    bpy.utils.register_class(OBJECT_OT_SelectByName)
    bpy.utils.register_class(OBJECT_OT_ToggleVisibility)
    bpy.utils.register_class(OBJECT_OT_FocusOnObject)
    
    bpy.types.Scene.object_list = bpy.props.CollectionProperty(type=bpy.types.PropertyGroup)
    bpy.types.Scene.list_index = bpy.props.IntProperty(default=0)



def unregister():
    del bpy.types.Scene.my_tool
    del bpy.types.Scene.object_list
    del bpy.types.Scene.list_index

    bpy.utils.unregister_class(MyToolPropertyGroup)
    bpy.utils.unregister_class(OBJECT_OT_CollectObjects)
    bpy.utils.unregister_class(OBJECT_OT_CollectAllCategorizedObjects)
    bpy.utils.unregister_class(SCENE_UL_ObjectList)
    bpy.utils.unregister_class(OBJECT_PT_CustomPanel)
    bpy.utils.unregister_class(OBJECT_OT_SelectByName)
    bpy.utils.unregister_class(OBJECT_OT_ToggleVisibility)
    bpy.utils.unregister_class(OBJECT_OT_FocusOnObject)

if __name__ == "__main__":
    register()





############ Export to CSV #######################################3

import bpy
import os
import csv

# Operator to export custom properties of the selected object to a CSV file
class ExportSelectedObjectCSV(bpy.types.Operator):
    bl_idname = "export.selected_object_csv"
    bl_label = "Export Selected Object to CSV"

    def execute(self, context):
        object = context.object
        if object:
            filepath = os.path.join(bpy.path.abspath("//"), f"{object.name}_properties.csv")
            export_custom_properties_to_csv([object], filepath)
            self.report({'INFO'}, f"Exported properties of '{object.name}' to {filepath}")
        else:
            self.report({'ERROR'}, "No object selected")
        return {'FINISHED'}

# Operator to export custom properties of all objects in the scene to a CSV file
class ExportAllObjectsCSV(bpy.types.Operator):
    bl_idname = "export.all_objects_csv"
    bl_label = "Export All Objects to CSV"

    def execute(self, context):
        objects = context.scene.objects
        filepath = os.path.join(bpy.path.abspath("//"), "all_objects_properties.csv")
        export_custom_properties_to_csv(objects, filepath)
        self.report({'INFO'}, f"Exported properties of all objects to {filepath}")
        return {'FINISHED'}

def export_custom_properties_to_csv(objects, filepath):
    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
        # Include additional fields for MN, dropdown_list2, and dropdown_list1
        fieldnames = ['object_name', 'MN', 'Category', 'Subcategory', 'property_name', 'property_value']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        has_custom_string = False
        
        
        
        item1 = ['WP_X', 'WP03', 'WP04', 'WP05', 'WP06','WP07','WP08', 'WP09', 'WP10','RTP', 'CPI']
        item2 = ['-','Main Equipment', 'Tools', 'Auxillary Equipment']
        ## ^^^^ ['-','Main Equipment', 'Tools', 'Auxillary Equipment'] if '-' is with by deafualt, it will include Everything!
        
        for obj in objects:
            mn_value = obj.get("mn_custom_string", "")
            # Convert stored index to integer and use it to access the respective list
            # Ensure to handle cases where the property might not exist or have a non-integer value
            try:
                dropdown_list1_index = int(obj.get("dropdown_list1", ""))  # Default to 0 (now replaced with "") or any appropriate default index
                dropdown_list1_value = item1[dropdown_list1_index]
            except (ValueError, IndexError):
                dropdown_list1_value = "Invalid selection"  # Handle invalid index
            
            try:
                dropdown_list2_index = int(obj.get("dropdown_list2", ""))  # Default to 0
                dropdown_list2_value = item2[dropdown_list2_index]
            except (ValueError, IndexError):
                dropdown_list2_value = "Invalid selection"  # Handle invalid index
    
            

            
            for key in obj.keys():
                if key.startswith("custom_string_"):
                    writer.writerow({
                        'object_name': obj.name,
                        'MN': mn_value,
                        'Category': dropdown_list2_value,  # Assuming 'Category' represents 'dropdown_list2'
                        'Subcategory': dropdown_list1_value,  # Assuming 'Subcategory' represents 'dropdown_list1'
                        'property_name': key,
                        'property_value': obj[key]
                    })
                    has_custom_string = True
            
            # If the object doesn't have custom_string_ properties but you still want to output its other properties
            if not has_custom_string:
                writer.writerow({
                    'object_name': obj.name,
                    'MN': mn_value,
                    'Category': dropdown_list2_value,
                    'Subcategory': dropdown_list1_value,
                    'property_name': '',
                    'property_value': ''
                })

# Panel to hold the export buttons
class OBJECT_PT_CustomPropertiesExportPanel(bpy.types.Panel):
    bl_label = "Custom Properties Export"
    bl_idname = "OBJECT_PT_custom_properties_export"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Export CSV'

    def draw(self, context):
        layout = self.layout
        layout.operator("export.selected_object_csv", text="Export Selected Object")
        layout.operator("export.all_objects_csv", text="Export All Objects")

def register():
    bpy.utils.register_class(ExportSelectedObjectCSV)
    bpy.utils.register_class(ExportAllObjectsCSV)
    bpy.utils.register_class(OBJECT_PT_CustomPropertiesExportPanel)

def unregister():
    bpy.utils.unregister_class(ExportSelectedObjectCSV)
    bpy.utils.unregister_class(ExportAllObjectsCSV)
    bpy.utils.unregister_class(OBJECT_PT_CustomPropertiesExportPanel)

if __name__ == "__main__":
    register()
    
    
    
    
    
    
########################################################## Test of making collections for each entety and so on (to better navigat later on

import bpy

# Operator to create collections
class CreateCollectionsOperator(bpy.types.Operator):
    """Create Custom Collections"""
    bl_idname = "view3d.create_custom_collections"
    bl_label = "Create Collections"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        collection_names = ["Main Eq.", "Tools", "Auxillary Eq.", "Story", "Un-assigned objects"]
        main_collection = context.scene.collection

        for name in collection_names:
            # Check if the collection already exists
            if not any(coll.name == name for coll in main_collection.children):
                # Create the new collection and link it to the main scene collection
                new_collection = bpy.data.collections.new(name)
                main_collection.children.link(new_collection)

        return {'FINISHED'}

# Operator to move objects to their specified collections
class MoveObjectsToCollectionsOperator(bpy.types.Operator):
    """Move Objects to Specified Collections"""
    bl_idname = "view3d.move_objects_to_collections"
    bl_label = "Move Objects to Collections"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        # Mapping from dropdown list values to collection names
        dropdown_to_collection = {
            '1': "Main Eq.",
            '2': "Tools",
            '3': "Auxillary Eq.",
            '0': "Un-assigned objects",
        }

        # Iterate over all objects in the scene
        for obj in bpy.context.scene.objects:
            # Get the collection name based on the object's dropdown_list2 property
            collection_name = dropdown_to_collection.get(obj.dropdown_list2, "Un-assigned objects")
            
            # Check if the target collection exists
            target_collection = bpy.data.collections.get(collection_name)
            if target_collection:
                # Link the object to the target collection
                if obj.name not in target_collection.objects:
                    target_collection.objects.link(obj)
                
                # Unlink the object from other collections it might belong to
                for collection in obj.users_collection:
                    if collection != target_collection:
                        collection.objects.unlink(obj)

        return {'FINISHED'}

# Define the UI panel
class CollectionsManagementPanel(bpy.types.Panel):
    """Creates a Panel in the 3D View's N panel"""
    bl_label = "Collections Management"
    bl_idname = "VIEW3D_PT_custom_collections_management"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Collection and assigning the object in correct folders!'

    def draw(self, context):
        layout = self.layout

        # Button to create collections
        layout.operator("view3d.create_custom_collections", text="Create Collections")
        
        # Button to move objects to collections
        layout.operator("view3d.move_objects_to_collections", text="Move Objects to Collections")

# Registering the operators and panel
def register():
    bpy.utils.register_class(CreateCollectionsOperator)
    bpy.utils.register_class(MoveObjectsToCollectionsOperator)
    bpy.utils.register_class(CollectionsManagementPanel)

def unregister():
    bpy.utils.unregister_class(CreateCollectionsOperator)
    bpy.utils.unregister_class(MoveObjectsToCollectionsOperator)
    bpy.utils.unregister_class(CollectionsManagementPanel)

if __name__ == "__main__":
    register()

