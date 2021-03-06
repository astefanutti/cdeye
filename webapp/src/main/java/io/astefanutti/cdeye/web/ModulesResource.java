/**
 * Copyright (C) 2014 Antonin Stefanutti (antonin.stefanutti@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.astefanutti.cdeye.web;


import io.astefanutti.cdeye.core.CdEye;
import io.astefanutti.cdeye.core.model.CdEyeModules;

import javax.annotation.ManagedBean;
import javax.enterprise.inject.spi.Bean;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ManagedBean
@Path("modules")
public class ModulesResource {

    private static final Pattern JAR_PATTERN = Pattern.compile("jar:file:(?<jar>.*\\.jar)!(?<class>.*\\.class)");

    @Inject
    private CdEye cdEye;

    @GET
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public CdEyeModules getModules() {
        Map<String, List<String>> jars = new HashMap<>();
        for (Bean<?> bean : cdEye.getBeans()) {
            URL url = bean.getBeanClass().getResource(bean.getBeanClass().getSimpleName() + ".class");
            if (url == null)
                // TODO: handle nested classes
                continue;

            Matcher matcher = JAR_PATTERN.matcher(String.valueOf(url));
            if (matcher.matches()) {
                if (!jars.containsKey(matcher.group("jar")))
                    jars.put(matcher.group("jar"), new ArrayList<String>());
                jars.get(matcher.group("jar")).add(cdEye.getBeanId(bean));
            }
        }

        CdEyeModules modules = new CdEyeModules();
        for (Map.Entry<String, List<String>> jar : jars.entrySet())
            modules.withNewModule()
                .withName(jar.getKey())
                .withBeans()
                    .withBean(jar.getValue());

        return modules;
    }
}
