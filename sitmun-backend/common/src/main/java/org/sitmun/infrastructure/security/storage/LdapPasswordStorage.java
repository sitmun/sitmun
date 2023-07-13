package org.sitmun.infrastructure.security.storage;

import org.sitmun.infrastructure.security.core.LdapUserAuthoritiesPopulator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.crypto.password.LdapShaPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Profile("ldap")
@Component
@Order(1)
public class LdapPasswordStorage implements PasswordStorage {

	private final LdapUserAuthoritiesPopulator ldapUserAuthoritiesPopulator;

	@Value("${security.authentication.ldap.host}")
	private String host;

	@Value("${security.authentication.ldap.base_dn}")
	private String baseDN;

	@Value("${security.authentication.ldap.user_dn_pattern}")
	private String userDNPattern;

	@Value("${security.authentication.ldap.user_ldap}")
	private String userLdap;

	@Value("${security.authentication.ldap.password_ldap}")
	private String passwordLdap;

	public LdapPasswordStorage(LdapUserAuthoritiesPopulator ldapUserAuthoritiesPopulator) {
		this.ldapUserAuthoritiesPopulator = ldapUserAuthoritiesPopulator;
	}

	@Override
	public void addPasswordStorage(AuthenticationManagerBuilder authenticationManagerBuilder) throws Exception {
		String url = StringUtils.hasText(this.host) && StringUtils.hasText(this.baseDN)
				? this.host.concat("/").concat(this.baseDN)
				: null;
		authenticationManagerBuilder.ldapAuthentication()
				.passwordEncoder(ldapPasswordEncoder())
				.userDnPatterns(this.userDNPattern)
				.ldapAuthoritiesPopulator(ldapUserAuthoritiesPopulator)
				.contextSource().url(url)
				.managerDn(StringUtils.hasText(this.userLdap) ? this.userLdap : null)
				.managerPassword(StringUtils.hasText(this.passwordLdap) ? this.passwordLdap : null);
	}

	public PasswordEncoder ldapPasswordEncoder() {
		return new LdapShaPasswordEncoder();
	}
}