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
package io.astefanutti.cdeye.core;


import javax.enterprise.event.Observes;
import javax.enterprise.inject.spi.Bean;
import javax.enterprise.inject.spi.Extension;
import javax.enterprise.inject.spi.ProcessBean;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CdEyeExtension implements Extension {

    private final Set<String> exclusions = new HashSet<>(Arrays.asList("org.jboss.weld", "javax.enterprise.inject"));

    private final List<Bean<?>> beans = new ArrayList<>();

    public List<Bean<?>> getBeans() {
        return Collections.unmodifiableList(beans);
    }

    private <X> void processBean(@Observes ProcessBean<X> pb) {
        if (!isExcludedPackage(pb.getBean().getBeanClass().getPackage()))
            beans.add(pb.getBean());
    }

    private boolean isExcludedPackage(Package pkg) {
        for (String exclusion : exclusions)
            if (pkg.getName().startsWith(exclusion))
                return true;

        return false;
    }
}
