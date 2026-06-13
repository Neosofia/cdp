// Show the clinician navigation menu to users with the clinician actor.
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"clinician"
) when {
    principal.actors.contains("clinician")
};
