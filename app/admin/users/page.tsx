import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { getPlatformAdministration } from "@/lib/data/platform-repository";

export default async function Page() {
  const { users } = await getPlatformAdministration();
  return (
    <>
      <PageHeader
        eyebrow="Platform Administration"
        title="Users / Access"
        description="Review and provision platform, organization, portal, and pending access."
        action={
          <Link className="primary-button" href="/admin/users/new">
            ＋ Create User
          </Link>
        }
      />
      <section className="panel">
        {users.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Access state</th>
                  <th>Organizations / roles</th>
                  <th>Portal access</th>
                  <th>Profile</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <b>
                        {user.display_name ||
                          [user.first_name, user.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          user.email ||
                          "Unnamed user"}
                      </b>
                      <small className="table-secondary">
                        {user.email ?? "No email"}
                      </small>
                    </td>
                    <td>
                      <Badge value={user.accessState} />
                    </td>
                    <td>
                      {user.memberships.length
                        ? user.memberships.map((membership) => (
                            <span className="access-line" key={membership.id}>
                              {membership.organizationName} ·{" "}
                              {membership.role.replaceAll("_", " ")} ·{" "}
                              {membership.active ? "Active" : "Inactive"}
                            </span>
                          ))
                        : "—"}
                    </td>
                    <td>{user.portalAccess}</td>
                    <td>
                      <Badge value={user.is_active ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td>
                      <Link
                        className="case-link"
                        href={`/admin/users/${user.id}`}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty compact-empty">
            <h2>No user profiles yet</h2>
            <p>
              Invite the first user and optionally provision organization
              access.
            </p>
            <Link className="primary-button" href="/admin/users/new">
              Create User
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
