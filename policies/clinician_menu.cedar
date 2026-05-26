permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"clinician"
) when {
    principal.roles.contains("clinician")
};
