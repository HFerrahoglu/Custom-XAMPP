# XAMPP Control Panel Custom Themes

This directory contains custom themes for the XAMPP Control Panel application. You can create, edit, and manage themes through the Theme Manager in the application.

## Theme Structure

Each theme is stored as a JSON file with the following structure:

```json
{
  "name": "Theme Name",
  "id": "theme-id",
  "author": "Author Name",
  "description": "A description of the theme",
  "colors": {
    "bg-color": "#hexcolor",
    "card-bg": "#hexcolor",
    "border-color": "#hexcolor",
    "text-color": "#hexcolor",
    "text-secondary": "#hexcolor",
    "btn-bg": "#hexcolor",
    "btn-hover": "#hexcolor",
    "status-running": "#hexcolor",
    "status-Stopped": "#hexcolor",
    "notification-info": "#hexcolor",
    "notification-success": "#hexcolor",
    "notification-warning": "#hexcolor",
    "notification-error": "#hexcolor",
    "shadow-color": "#hexcolor"
  }
}
```

## Creating Custom Themes

To create a custom theme:

1. Open the XAMPP Control Panel application
2. Click the Settings (gear) icon in the top-right corner
3. In the Theme Manager, click the "Create Theme" tab
4. Fill in the theme details and customize colors
5. Click "Save Theme"

## Manual Theme Creation

You can also manually create theme files in this directory. Make sure to follow the structure above and use a unique ID for your theme.

## Default Themes

The application comes with two default themes:
- Default Dark (`default-dark.json`)
- Default Light (`default-light.json`)

These default themes cannot be deleted but can be modified.

## Included Example Themes

- **Blue Ocean**: A calming blue theme

Enjoy customizing your XAMPP Control Panel experience!