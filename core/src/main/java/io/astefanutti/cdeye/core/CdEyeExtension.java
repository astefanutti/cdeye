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
import javax.enterprise.inject.spi.AfterDeploymentValidation;
import javax.enterprise.inject.spi.Bean;
import javax.enterprise.inject.spi.BeanManager;
import javax.enterprise.inject.spi.Extension;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.enterprise.inject.spi.ProcessBean;
import javax.enterprise.inject.spi.ProcessProducerField;
import javax.enterprise.inject.spi.ProcessProducerMethod;
import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CdEyeExtension implements Extension {

    // TODO: enable extensibility of package exclusion
    private final Set<String> exclusions = new HashSet<>(Arrays.asList("org.jboss.weld", "javax.enterprise.inject", "org.glassfish.jersey.gf.cdi"));

    private final List<Bean<?>> beans = new ArrayList<>();

    private final List<Bean<?>> producers = new ArrayList<>();

    private BeanManager manager;

    public List<Bean<?>> getBeans() {
        return Collections.unmodifiableList(beans);
    }

    public boolean isProducer(Bean<?> bean) {
        return producers.contains(bean);
    }

    public List<Bean<?>> getProducers(Class<?> clazz) {
        List<Bean<?>> producerBeans = new ArrayList<>();
        for (Bean<?> bean : producers)
            if (bean.getBeanClass().equals(clazz))
                producerBeans.add(bean);

        return producerBeans;
    }

    public Bean<?> resolveBean(InjectionPoint ip) {
        Set<Bean<?>> beans = manager.getBeans(ip.getType(), ip.getQualifiers().toArray(new Annotation[ip.getQualifiers().size()]));
        return manager.resolve(beans);
    }

    public String getBeanId(Bean<?> bean) {
        return String.valueOf(beans.indexOf(bean));
    }

    private <X> void processBean(@Observes ProcessBean<X> pb) {
        if (!isExcludedPackage(pb.getBean().getBeanClass().getPackage()))
            beans.add(pb.getBean());
    }

    private <T, X> void processProducerField(@Observes ProcessProducerField<T, X> ppf) {
        producers.add(ppf.getBean());
    }

    private <T, X> void processProducerMethod(@Observes ProcessProducerMethod<T, X> ppm) {
        producers.add(ppm.getBean());
    }

    private void afterDeploymentValidation(@Observes AfterDeploymentValidation adv, BeanManager manager) {
        this.manager = manager;
    }

    private boolean isExcludedPackage(Package pkg) {
        for (String exclusion : exclusions)
            if (pkg.getName().startsWith(exclusion))
                return true;

        return false;
    }
}
