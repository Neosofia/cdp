// Show the patient navigation menu to users with the patient actor.
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"patient"
) when {
    principal.actors.contains("patient")
};
