permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"admin"
) when {
    principal.roles.contains("admin")
};
