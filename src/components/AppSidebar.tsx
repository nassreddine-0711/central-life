import { NavLink, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navItems } from "@/config/nav";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shrink-0 z-40">
      <SidebarContent className="bg-sidebar/60 backdrop-blur-xl">
        {/* Brand */}
        <div className={`flex items-center gap-3 px-4 py-6 ${collapsed ? "justify-center px-2" : ""}`}>
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground">
                My Life <span className="text-gradient">NB</span>
              </span>
            </div>
          )}
        </div>

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      className={`group h-11 w-full rounded-xl transition-all duration-300 ${
                        active
                          ? "bg-gradient-to-r from-primary/15 to-accent/10 text-foreground shadow-glow-soft"
                          : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
                      }`}
                    >
                      <NavLink to={item.url} end className="flex items-center w-full">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                          <item.icon
                            className={`h-[18px] w-[18px] transition-colors ${
                              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          {active && (
                            <span className="absolute inset-0 rounded-lg bg-primary/10 blur-md" />
                          )}
                        </div>
                        {!collapsed && (
                          <div className="flex flex-col leading-tight ml-3 truncate">
                            <span className="text-sm font-medium truncate">{item.title}</span>
                          </div>
                        )}
                        {active && !collapsed && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow shrink-0" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}