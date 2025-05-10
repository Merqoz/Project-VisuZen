import bpy
import gpu
import blf
from gpu_extras.batch import batch_for_shader
from bpy.types import Operator, Panel, Menu
from bpy.props import IntProperty, BoolProperty, FloatVectorProperty
import gpu
from mathutils import Color

class VIEW3D_MT_PIE_data_viewer(Menu):
    bl_label = "Data Viewer Pie"
    
    def draw(self, context):
        layout = self.layout
        pie = layout.menu_pie()
        
        # Add menu items in clockwise order starting from top
        pie.operator("wm.custom_data_window", text="Open Data Viewer", icon='WINDOW')
        pie.operator("object.select_all", text="Select All", icon='SELECT_SET')
        pie.operator("object.hide_view_clear", text="Show Hidden", icon='HIDE_OFF')
        pie.operator("object.delete", text="Delete", icon='X')
        pie.operator("object.shade_smooth", text="Smooth", icon='MOD_SMOOTH')
        pie.operator("object.shade_flat", text="Flat", icon='MESH_PLANE')
        pie.operator("object.origin_set", text="Set Origin", icon='OBJECT_ORIGIN')
        pie.operator("view3d.view_selected", text="View Selected", icon='ZOOM_SELECTED')

class WM_OT_custom_data_window(Operator):
    bl_idname = "wm.custom_data_window"
    bl_label = "Object Data Viewer"
    
    # Window properties
    window_width: IntProperty(default=500)
    window_height: IntProperty(default=600)
    window_x: IntProperty(default=100)
    window_y: IntProperty(default=100)
    
    # UI State properties
    is_dragging: BoolProperty(default=False)
    drag_offset_x: IntProperty(default=0)
    drag_offset_y: IntProperty(default=0)
    hover_row: IntProperty(default=-1)
    
    # Theme colors
    HEADER_COLOR = (0.169, 0.453, 0.698, 1.0)  # Blue
    BG_COLOR = (0.15, 0.15, 0.15, 0.95)
    SECTION_BG = (0.2, 0.2, 0.2, 1.0)
    HOVER_COLOR = (0.25, 0.25, 0.3, 1.0)
    TEXT_COLOR = (0.9, 0.9, 0.9, 1.0)
    ACCENT_COLOR = (0.267, 0.639, 0.867, 1.0)
    
    _timer = None
    _handle = None
    
    def draw_rounded_box(self, shader, x, y, width, height, color, radius=5):
        vertices = [
            (x + radius, y),
            (x + width - radius, y),
            (x + width - radius, y - height),
            (x + radius, y - height)
        ]
        indices = ((0, 1, 2), (2, 3, 0))
        
        shader.bind()
        shader.uniform_float("color", color)
        batch = batch_for_shader(shader, 'TRIS', {"pos": vertices}, indices=indices)
        batch.draw(shader)
    
    def draw_text(self, text, x, y, size=12, color=(1, 1, 1, 1)):
        font_id = 0
        blf.enable(font_id, blf.SHADOW)
        blf.shadow(font_id, 3, 0, 0, 0, 0.5)
        blf.size(font_id, size)
        blf.color(font_id, *color)
        blf.position(font_id, x, y, 0)
        blf.draw(font_id, str(text))
        blf.disable(font_id, blf.SHADOW)

    def draw_status_indicator(self, shader, x, y, status):
        status_colors = {
            'Active': (0.2, 0.8, 0.2, 1.0),    # Green
            'Pending': (0.8, 0.8, 0.2, 1.0),   # Yellow
            'Complete': (0.2, 0.6, 0.8, 1.0),  # Blue
            'N/A': (0.5, 0.5, 0.5, 1.0)        # Gray
        }
        
        color = status_colors.get(status, (0.5, 0.5, 0.5, 1.0))
        self.draw_rounded_box(shader, x, y, 10, 10, color)
    
    def draw_callback_px(self, context):
        shader = gpu.shader.from_builtin('UNIFORM_COLOR')
        gpu.state.blend_set('ALPHA')
        
        # Draw window shadow
        shadow_offset = 5
        self.draw_rounded_box(shader,
                            self.window_x - shadow_offset,
                            self.window_y + shadow_offset,
                            self.window_width + shadow_offset*2,
                            self.window_height + shadow_offset*2,
                            (0, 0, 0, 0.3))
        
        # Main window background
        self.draw_rounded_box(shader,
                            self.window_x,
                            self.window_y,
                            self.window_width,
                            self.window_height,
                            self.BG_COLOR)
        
        # Header
        self.draw_rounded_box(shader,
                            self.window_x,
                            self.window_y,
                            self.window_width,
                            40,
                            self.HEADER_COLOR)
        
        # Window title
        self.draw_text("📊 Object Data Viewer",
                      self.window_x + 15,
                      self.window_y - 25,
                      size=16,
                      color=(1, 1, 1, 1))
        
        obj = context.active_object
        if not obj:
            self.draw_text("No object selected",
                          self.window_x + 20,
                          self.window_y - 80,
                          size=14,
                          color=(0.8, 0.8, 0.8, 1))
            return
        
        y_offset = self.window_y - 60
        section_padding = 15
        section_x = self.window_x + section_padding
        section_width = self.window_width - section_padding * 2
        
        # Object Info Section
        info_box_height = 80
        self.draw_rounded_box(shader,
                            section_x,
                            y_offset,
                            section_width,
                            info_box_height,
                            self.SECTION_BG)
        
        self.draw_text("🔷 Object Information",
                      section_x + 10,
                      y_offset - 25,
                      size=14,
                      color=self.TEXT_COLOR)
        
        mn_value = obj.get('mn_custom_string', 'N/A')
        self.draw_text(f"Name: {obj.name}",
                      section_x + 20,
                      y_offset - 45,
                      size=13,
                      color=self.TEXT_COLOR)
        
        self.draw_text(f"MN: {mn_value}",
                      section_x + 20,
                      y_offset - 65,
                      size=13,
                      color=self.TEXT_COLOR)
        
        y_offset -= info_box_height + 20
        
        # Classification Section
        class_box_height = 80
        self.draw_rounded_box(shader,
                            section_x,
                            y_offset,
                            section_width,
                            class_box_height,
                            self.SECTION_BG)
        
        self.draw_text("🏷️ Classification",
                      section_x + 10,
                      y_offset - 25,
                      size=14,
                      color=self.TEXT_COLOR)
        
        item1 = ['-','Main Equipment', 'Tools', 'Auxillary Equipment']
        item2 = ['WP_X', 'WP03', 'WP04', 'WP05', 'WP06','WP07','WP08', 'WP09', 'WP10','RTP', 'CPI']
        dropdown1_value = obj.get("dropdown_list1", 0)
        dropdown2_value = obj.get("dropdown_list2", 0)
        n1 = item1[int(dropdown2_value)]
        n2 = item2[int(dropdown1_value)]
        
        self.draw_text(f"Type: {n1}",
                      section_x + 20,
                      y_offset - 45,
                      size=13,
                      color=self.TEXT_COLOR)
        
        self.draw_text(f"Workpackage: {n2}",
                      section_x + 20,
                      y_offset - 65,
                      size=13,
                      color=self.TEXT_COLOR)
        
        y_offset -= class_box_height + 20
        
        # Documents Section
        self.draw_text("📑 Documents",
                      section_x + 10,
                      y_offset - 25,
                      size=14,
                      color=self.TEXT_COLOR)
        
        y_offset -= 40
        
        # Headers
        headers = ["Description", "SAP Dir", "Status", "Version"]
        header_x = section_x + 20
        
        for header in headers:
            self.draw_text(header,
                          header_x,
                          y_offset,
                          size=12,
                          color=self.ACCENT_COLOR)
            header_x += section_width // 4
        
        y_offset -= 25
        
        # Document Entries
        i = 1
        row_height = 30
        
        while any(f"custom_string_{i}_{col}" in obj.keys() for col in range(1, 5)):
            row_color = self.HOVER_COLOR if i == self.hover_row else self.SECTION_BG
            self.draw_rounded_box(shader,
                                section_x,
                                y_offset + 5,
                                section_width,
                                row_height,
                                row_color)
            
            x_offset = section_x + 20
            for col in range(1, 5):
                prop_name = f'custom_string_{i}_{col}'
                value = obj.get(prop_name, 'N/A')
                
                if col == 3:  # Status column
                    self.draw_status_indicator(shader, x_offset, y_offset - 5, value)
                    x_offset += 10
                
                self.draw_text(value,
                             x_offset,
                             y_offset - 15,
                             size=12,
                             color=self.TEXT_COLOR)
                x_offset += section_width // 4
            
            y_offset -= row_height
            i += 1
        
        gpu.state.blend_set('NONE')
    
    def modal(self, context, event):
        if context.area:
            context.area.tag_redraw()
                
        if event.type == 'ESC':
            self.cancel(context)
            return {'CANCELLED'}
                
        if event.type == 'TIMER':
            for area in context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()
        
        # Find the 3D View region
        region = None
        for area in context.screen.areas:
            if area.type == 'VIEW_3D':
                for r in area.regions:
                    if r.type == 'WINDOW':
                        region = r
                        break
                break
        
        if not region:
            return {'PASS_THROUGH'}
        
        # Get mouse coordinates relative to region
        mouse_x = event.mouse_x - region.x
        mouse_y = event.mouse_y - region.y
        
        # Check if mouse is over our panel
        is_over_panel = (
            self.window_x <= mouse_x <= self.window_x + self.window_width and
            self.window_y - self.window_height <= mouse_y <= self.window_y
        )
        
        # Handle mouse interaction for dragging
        if event.type == 'LEFTMOUSE':
            if event.value == 'PRESS':
                # Check if mouse is in header area
                is_over_header = (
                    self.window_x <= mouse_x <= self.window_x + self.window_width and
                    self.window_y - 40 <= mouse_y <= self.window_y
                )
                
                if is_over_header:
                    self.is_dragging = True
                    self.drag_offset_x = mouse_x - self.window_x
                    self.drag_offset_y = mouse_y - self.window_y
                    return {'RUNNING_MODAL'}
                    
            elif event.value == 'RELEASE':
                if self.is_dragging:
                    self.is_dragging = False
                    return {'RUNNING_MODAL'}
        
        elif event.type == 'MOUSEMOVE':
            if self.is_dragging and region:
                self.window_x = mouse_x - self.drag_offset_x
                self.window_y = mouse_y - self.drag_offset_y
                return {'RUNNING_MODAL'}
            elif is_over_panel:
                # Update hover states
                y_offset = self.window_y - 240
                row_height = 30
                mouse_row = int((y_offset - event.mouse_y) / row_height) + 1
                if 1 <= mouse_row <= 100:
                    self.hover_row = mouse_row
                else:
                    self.hover_row = -1
                return {'RUNNING_MODAL'}
        
        # Consume events over panel
        if is_over_panel:
            return {'RUNNING_MODAL'}
                
        return {'PASS_THROUGH'}
    
    def invoke(self, context, event):
        if context.area.type == 'VIEW_3D':
            args = (context,)
            self._handle = bpy.types.SpaceView3D.draw_handler_add(
                self.draw_callback_px, args, 'WINDOW', 'POST_PIXEL')
            
            wm = context.window_manager
            self._timer = wm.event_timer_add(0.1, window=context.window)
            
            self.window_x = event.mouse_x - context.region.x
            self.window_y = event.mouse_y - context.region.y
            
            wm.modal_handler_add(self)
            return {'RUNNING_MODAL'}
        
        return {'CANCELLED'}
    
    def cancel(self, context):
        if self._handle:
            bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
        if self._timer:
            context.window_manager.event_timer_remove(self._timer)

class VIEW3D_PT_custom_window_button(Panel):
    bl_label = "Data Viewer"
    bl_idname = "VIEW3D_PT_custom_window_button"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Data Viewer'
    
    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.operator("wm.custom_data_window", text="Open Data Viewer", icon='WINDOW')

addon_keymaps = []

def register():
    bpy.utils.register_class(WM_OT_custom_data_window)
    bpy.utils.register_class(VIEW3D_PT_custom_window_button)
    bpy.utils.register_class(VIEW3D_MT_PIE_data_viewer)
    
    # Register shortcut
    wm = bpy.context.window_manager
    kc = wm.keyconfigs.addon
    if kc:
        km = kc.keymaps.new(name='Object Mode')
        kmi = km.keymap_items.new('wm.call_menu_pie', 'Q', 'PRESS', alt=True)
        kmi.properties.name = "VIEW3D_MT_PIE_data_viewer"
        addon_keymaps.append((km, kmi))

def unregister():
    # Clean up shortcut
    for km, kmi in addon_keymaps:
        km.keymap_items.remove(kmi)
    addon_keymaps.clear()
    
    bpy.utils.unregister_class(VIEW3D_MT_PIE_data_viewer)
    bpy.utils.unregister_class(VIEW3D_PT_custom_window_button)
    bpy.utils.unregister_class(WM_OT_custom_data_window)

if __name__ == "__main__":
    register()