# Restore Plan My Trip Feature

The "Plan My Trip" feature has been temporarily disabled (commented out). Follow these steps to restore it:

## 1. User Facing Component
In [layout.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/(user)/layout.tsx):
- **Import**: Uncomment line 58: `// import PlanMyTrip from "@/components/common/Plan-My-Trip";` -> `import PlanMyTrip from "@/components/common/Plan-My-Trip";`
- **Component**: Uncomment line 117: `{/* <PlanMyTrip /> */}` -> `<PlanMyTrip />`

## 2. Admin Sidebars
### Standard Sidebar
In [AdminSidebar.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/admin/AdminSidebar.tsx):
- Remove the block comment around the "Plan My Trip" object in the `NAV` array (around lines 44-50).

### Modern Sidebar
In [app-sidebar.tsx](file:///Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/admin/app-sidebar.tsx):
- Remove the block comment around the "Plan My Trip" object in the `NAV_GROUPS` array under "Packages" (around lines 156-162).

---
*Date: 2026-03-30*
