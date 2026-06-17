import * as React from "react"
import "./ui.css"

const variantClass = {
  default:     "ui-btn-default",
  destructive: "ui-btn-destructive",
  outline:     "ui-btn-outline",
  secondary:   "ui-btn-secondary",
  ghost:       "ui-btn-ghost",
  link:        "ui-btn-link",
}
const sizeClass = {
  default: "",
  sm:      "ui-btn-sm",
  lg:      "ui-btn-lg",
  icon:    "ui-btn-icon",
}

const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={["ui-btn", variantClass[variant] || variantClass.default, sizeClass[size] || "", className].filter(Boolean).join(" ")}
    {...props}
  />
))
Button.displayName = "Button"

export { Button }
