#Navbar
-Sublinks on each tab.
-Sublinks attached to different areas on each page. 
-Good color contrasting
-Smooth drop down
-Responsive (JavaScript)


#ADA Compliance
-Dark Mode (Located in bottom right of screen constantly)
-Color blind modes
-Different color sets to fit comfort

sites to check out:
-https://pass.securly.com/ 
    ~I like the style it has for the menu and the Icon
    ~Seizure Safety Would be easy to do just my making the colors flat and reduce motion/visual triggers 
    {To implement an effective Seizure Safety mode, the application's design system relies on centralized theme management using CSS variables for key visual properties. Rather than hardcoding colors, transition speeds, and animation curves directly into individual page components, these dynamic values are declared at the root level of the layout. When a user activates the safety toggle button, a JavaScript event listener tracks the active state and toggles a dedicated accessibility class on the main site container. This single class swap overrides the global variables instantly across the entire interface—flattening aggressive background gradients, toning down high-contrast flash points, and capping standard UI animations to instant or minimal durations.
    Beyond the manual toggle, the system integrates seamlessly with native browser accessibility preferences through the prefers-reduced-motion media query. By detecting whether a user already has motion-reduction settings turned on at their operating system level, the interface can default to the safe state automatically upon initial load. Storing this choice in local browser storage ensures the low-trigger environment persists as the user navigates between pages or returns in future sessions, maintaining a consistent, accessible experience without impacting the core navigation layout.}