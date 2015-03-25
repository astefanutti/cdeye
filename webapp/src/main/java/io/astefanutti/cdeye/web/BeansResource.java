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
import io.astefanutti.cdeye.core.model.CdEyeBean;
import io.astefanutti.cdeye.core.model.CdEyeBeans;

import javax.annotation.ManagedBean;
import javax.enterprise.event.Event;
import javax.enterprise.inject.Instance;
import javax.enterprise.inject.spi.Bean;
import javax.enterprise.inject.spi.BeanManager;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.lang.reflect.Array;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;

@ManagedBean
@Path("beans")
public class BeansResource {

    @Inject
    private CdEye cdEye;

    // TODO: find a way to hide CDEye Web internal beans

    @GET
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public CdEyeBeans getBeans() {
        CdEyeBeans beans = new CdEyeBeans();
        for (Bean<?> bean : cdEye.getBeans()) {
            CdEyeBean cdEyeBean = cdEyeBean(bean);
            for (InjectionPoint ip : bean.getInjectionPoints()) {
                // Skip InjectionPoint and BeanManager injection points
                if (InjectionPoint.class.equals(getRawType(ip.getType())) || BeanManager.class.equals(getRawType(ip.getType())))
                    continue;
                if (Instance.class.equals(getRawType(ip.getType())) || Event.class.equals(getRawType(ip.getType())))
                    // TODO: support programmatic lookup and events
                    continue;
                Bean<?> resolved = cdEye.resolveBean(ip);
                if (!cdEye.isExcluded(resolved))
                    cdEyeBean.withInjectionPoints()
                        .withNewInjectionPoint()
                        .withBean(cdEyeBean(resolved));
            }
            if (!cdEye.isProducer(bean))
                for (Bean<?> producer : cdEye.getProducers(bean.getBeanClass()))
                    cdEyeBean.withProducers()
                        .withNewProducer()
                        .withName(cdEye.getProducerName(producer))
                        .withBean(cdEyeBean(producer));

            beans.withBean(cdEyeBean);
        }
        return beans;
    }

    private CdEyeBean cdEyeBean(Bean<?> bean) {
        return new CdEyeBean()
            .withId(cdEye.getBeanId(bean))
            .withClassName(bean.getBeanClass().getName())
            .withClassSimpleName(bean.getBeanClass().getSimpleName());
    }

    private Class<?> getRawType(Type type) {
        if (type instanceof Class<?>) {
            return Class.class.cast(type);
        }
        else if (type instanceof ParameterizedType) {
            return getRawType(ParameterizedType.class.cast(type).getRawType());
        }
        else if (type instanceof TypeVariable<?>) {
            return getBound(TypeVariable.class.cast(type).getBounds());
        }
        else if (type instanceof WildcardType) {
            return getBound(WildcardType.class.cast(type).getUpperBounds());
        }
        else if (type instanceof GenericArrayType) {
            Class<?> rawType = getRawType(GenericArrayType.class.cast(type).getGenericComponentType());
            if (rawType != null)
                return Array.newInstance(rawType, 0).getClass();
        }
        return null;
    }

    private Class<?> getBound(Type[] bounds) {
        if (bounds.length == 0)
            return Object.class;
        else
            return getRawType(bounds[0]);
    }
}
