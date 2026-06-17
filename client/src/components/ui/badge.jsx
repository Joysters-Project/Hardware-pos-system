import * as React from "react"
import "./ui.css"

const variantClass = {
  default:     "ui-badge-default",
  secondary:   "ui-badge-secondary",
  destructive: "ui-badge-destructive",
  outline:     "ui-badge-outline",
  success:     "ui-badge-success",
  warning:     "ui-badge-warning",
}

function Badge({ className = "", variant = "default", ...props }) {
  return (
    <div
      className={["ui-badge", variantClass[variant] || variantClass.default, className].filter(Boolean).join(" ")}
      {...props}
    />
  )
}

export { Badge }
